#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    collections::HashMap,
    env, fs,
    io::ErrorKind,
    path::{Path, PathBuf},
    sync::mpsc::channel,
    thread,
};

use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager, WebviewWindow};

const SESSION_UPDATED_EVENT: &str = "visual-aid:session-updated";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VisualAidPayload {
    version: u8,
    format: String,
    content: String,
    id: Option<String>,
    title: Option<String>,
    summary: Option<String>,
    mode: Option<String>,
    metadata: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VisualAidSession {
    opened_at: Option<String>,
    last_action: String,
    updated_at: Option<String>,
    items: Vec<VisualAidPayload>,
}

impl Default for VisualAidSession {
    fn default() -> Self {
        Self {
            opened_at: None,
            last_action: "clear".to_string(),
            updated_at: None,
            items: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VisualAidWorkspace {
    id: String,
    cwd: String,
    label: String,
    session_path: String,
    session: VisualAidSession,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VisualAidWorkspaceState {
    active_workspace_id: Option<String>,
    workspaces: Vec<VisualAidWorkspace>,
}

impl Default for VisualAidWorkspaceState {
    fn default() -> Self {
        Self {
            active_workspace_id: None,
            workspaces: Vec::new(),
        }
    }
}

fn default_session_path() -> Result<PathBuf, String> {
    if let Ok(path) = env::var("VISUAL_AID_SESSION_PATH") {
        return Ok(PathBuf::from(path));
    }

    let cwd = env::current_dir().map_err(|error| error.to_string())?;
    Ok(cwd.join(".visual-aid").join("session.json"))
}

fn default_registry_path() -> Result<PathBuf, String> {
    if let Ok(path) = env::var("VISUAL_AID_REGISTRY_PATH") {
        return Ok(PathBuf::from(path));
    }

    if let Some(home) = env::var_os("HOME").or_else(|| env::var_os("USERPROFILE")) {
        return Ok(PathBuf::from(home).join(".visual-aid").join("registry.json"));
    }

    let cwd = env::current_dir().map_err(|error| error.to_string())?;
    Ok(cwd.join(".visual-aid").join("registry.json"))
}

fn persisted_state_path(path: &Path) -> PathBuf {
    let file_stem = path
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or("state");
    let file_name = format!("{file_stem}.persisted.json");

    path.parent()
        .map(|parent| parent.join(&file_name))
        .unwrap_or_else(|| PathBuf::from(file_name))
}

fn workspace_id_for_cwd(cwd: &Path) -> String {
    cwd.to_string_lossy().into_owned()
}

fn workspace_label_for_cwd(cwd: &Path) -> String {
    cwd.file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .map(|name| name.to_string())
        .unwrap_or_else(|| cwd.to_string_lossy().into_owned())
}

fn workspace_cwd_from_session_path(session_path: &Path) -> PathBuf {
    let parent = session_path
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from("."));

    if parent
        .file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name == ".visual-aid")
    {
        return parent
            .parent()
            .map(Path::to_path_buf)
            .unwrap_or(parent);
    }

    parent
}

fn read_session_file(path: &Path) -> Result<Option<VisualAidSession>, String> {
    match fs::read_to_string(path) {
        Ok(raw) => serde_json::from_str(&raw)
            .map(Some)
            .map_err(|error| error.to_string()),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

fn read_workspace_state_file(path: &Path) -> Result<Option<VisualAidWorkspaceState>, String> {
    match fs::read_to_string(path) {
        Ok(raw) => serde_json::from_str(&raw)
            .map(Some)
            .map_err(|error| error.to_string()),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

fn should_persist_session(session: &VisualAidSession) -> bool {
    session.last_action == "show" && !session.items.is_empty()
}

fn should_persist_workspace_state(workspace_state: &VisualAidWorkspaceState) -> bool {
    workspace_state
        .workspaces
        .iter()
        .any(|workspace| should_persist_session(&workspace.session))
}

fn write_persisted_state<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let json = serde_json::to_string_pretty(value).map_err(|error| error.to_string())?;
    fs::write(path, json).map_err(|error| error.to_string())
}

fn remove_persisted_state(path: &Path) -> Result<(), String> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

fn state_watch_root(path: &Path) -> PathBuf {
    path.parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from("."))
}

fn should_handle_state_event(event: &Event, path: &Path) -> bool {
    event.paths.iter().any(|candidate| candidate == path)
}

fn workspace_state_from_session(
    cwd: PathBuf,
    session_path: PathBuf,
    session: VisualAidSession,
) -> VisualAidWorkspaceState {
    let workspace_id = workspace_id_for_cwd(&cwd);

    VisualAidWorkspaceState {
        active_workspace_id: Some(workspace_id.clone()),
        workspaces: vec![VisualAidWorkspace {
            id: workspace_id,
            cwd: cwd.to_string_lossy().into_owned(),
            label: workspace_label_for_cwd(&cwd),
            session_path: session_path.to_string_lossy().into_owned(),
            session,
        }],
    }
}

fn read_legacy_workspace_state(session_path: &Path) -> Result<Option<VisualAidWorkspaceState>, String> {
    let persisted_path = persisted_state_path(session_path);

    match read_session_file(session_path) {
        Ok(Some(session)) => Ok(Some(workspace_state_from_session(
            workspace_cwd_from_session_path(session_path),
            session_path.to_path_buf(),
            session,
        ))),
        Ok(None) | Err(_) => read_session_file(&persisted_path).map(|session| {
            session.map(|session| {
                workspace_state_from_session(
                    workspace_cwd_from_session_path(session_path),
                    session_path.to_path_buf(),
                    session,
                )
            })
        }),
    }
}

fn emit_workspace_update<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    registry_path: &Path,
) -> Result<(), String> {
    let workspace_state = read_workspace_state(Some(registry_path.to_string_lossy().into_owned()))?;
    app.emit(SESSION_UPDATED_EVENT, workspace_state)
        .map_err(|error| error.to_string())
}

fn start_session_bridge_watcher<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    let registry_path = default_registry_path()?;
    let watch_root = state_watch_root(&registry_path);

    if let Some(parent) = registry_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    thread::spawn(move || {
        let (tx, rx) = channel();
        let mut watcher = match RecommendedWatcher::new(
            move |result| {
                let _ = tx.send(result);
            },
            Config::default(),
        ) {
            Ok(watcher) => watcher,
            Err(error) => {
                eprintln!("visual-aid session watcher failed to start: {error}");
                return;
            }
        };

        if let Err(error) = watcher.watch(&watch_root, RecursiveMode::NonRecursive) {
            eprintln!(
                "visual-aid session watcher failed to watch {}: {error}",
                watch_root.display()
            );
            return;
        }

        for result in rx {
            let event = match result {
                Ok(event) => event,
                Err(error) => {
                    eprintln!("visual-aid session watcher error: {error}");
                    continue;
                }
            };

            if !should_handle_state_event(&event, &registry_path) {
                continue;
            }

            if let Err(error) = emit_workspace_update(&app, &registry_path) {
                eprintln!("visual-aid session emit failed: {error}");
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn read_workspace_state(registry_path: Option<String>) -> Result<VisualAidWorkspaceState, String> {
    let path = registry_path
        .map(PathBuf::from)
        .map(Ok)
        .unwrap_or_else(default_registry_path)?;
    let persisted_path = persisted_state_path(&path);
    let legacy_session_path = default_session_path()?;

    match read_workspace_state_file(&path) {
        Ok(Some(workspace_state)) => {
            if should_persist_workspace_state(&workspace_state) {
                write_persisted_state(&persisted_path, &workspace_state)?;
            } else {
                remove_persisted_state(&persisted_path)?;
            }

            Ok(workspace_state)
        }
        Ok(None) | Err(_) => {
            if let Some(legacy_workspace_state) = read_legacy_workspace_state(&legacy_session_path)? {
                return Ok(legacy_workspace_state);
            }

            read_workspace_state_file(&persisted_path)?
                .ok_or_else(|| "missing persisted workspace state".to_string())
                .or_else(|_| Ok(VisualAidWorkspaceState::default()))
        }
    }
}

#[tauri::command]
fn read_session_state(session_path: Option<String>) -> Result<VisualAidSession, String> {
    let path = session_path
        .map(PathBuf::from)
        .map(Ok)
        .unwrap_or_else(default_session_path)?;

    let workspace_state = read_workspace_state(None)?;
    let target_path = path.to_string_lossy().into_owned();

    if let Ok(workspace) = workspace_state
        .workspaces
        .iter()
        .find(|workspace| workspace.session_path == target_path)
        .ok_or_else(|| "workspace not found".to_string())
    {
        return Ok(workspace.session.clone());
    }

    read_legacy_workspace_state(&path)?
        .and_then(|workspace_state| workspace_state.workspaces.into_iter().next())
        .map(|workspace| workspace.session)
        .ok_or_else(|| "missing persisted session".to_string())
}

trait FocusableWindow {
    fn show_window(&self) -> tauri::Result<()>;
    fn unminimize_window(&self) -> tauri::Result<()>;
    fn focus_window(&self) -> tauri::Result<()>;
}

impl<R: tauri::Runtime> FocusableWindow for WebviewWindow<R> {
    fn show_window(&self) -> tauri::Result<()> {
        self.show()
    }

    fn unminimize_window(&self) -> tauri::Result<()> {
        self.unminimize()
    }

    fn focus_window(&self) -> tauri::Result<()> {
        self.set_focus()
    }
}

fn focus_existing_window(window: &impl FocusableWindow) {
    let _ = window.show_window();
    let _ = window.unminimize_window();
    let _ = window.focus_window();
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            start_session_bridge_watcher(app.handle().clone())?;
            Ok(())
        })
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                focus_existing_window(&window);
            }
        }))
        .invoke_handler(tauri::generate_handler![
            read_session_state,
            read_workspace_state
        ])
        .run(tauri::generate_context!())
        .expect("failed to run visual-aid application");
}

#[cfg(test)]
mod tests {
    use super::{
        focus_existing_window, persisted_state_path, read_workspace_state, state_watch_root,
        should_handle_state_event, workspace_state_from_session, FocusableWindow,
        VisualAidSession, VisualAidWorkspaceState,
    };
    use notify::Event;
    use std::{
        cell::RefCell,
        env, fs,
        path::{Path, PathBuf},
        process,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[derive(Default)]
    struct FakeWindow {
        calls: RefCell<Vec<&'static str>>,
    }

    impl FocusableWindow for FakeWindow {
        fn show_window(&self) -> tauri::Result<()> {
            self.calls.borrow_mut().push("show");
            Ok(())
        }

        fn unminimize_window(&self) -> tauri::Result<()> {
            self.calls.borrow_mut().push("unminimize");
            Ok(())
        }

        fn focus_window(&self) -> tauri::Result<()> {
            self.calls.borrow_mut().push("focus");
            Ok(())
        }
    }

    #[test]
    fn vas_single_instance_001_focuses_the_existing_main_window() {
        let window = FakeWindow::default();

        focus_existing_window(&window);

        assert_eq!(
            window.calls.borrow().as_slice(),
            ["show", "unminimize", "focus"]
        );
    }

    fn temp_root() -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock should be monotonic enough for tests")
            .as_nanos();

        env::temp_dir().join(format!("visual-aid-tauri-{suffix}-{}", process::id()))
    }

    fn cleanup(root: &Path) {
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn vps_persist_001_non_empty_show_sessions_are_persisted() {
        let root = temp_root();
        let registry_path = root.join("registry.json");
        let persisted_path = persisted_state_path(&registry_path);
        let workspace_state = VisualAidWorkspaceState {
            active_workspace_id: Some("/tmp/project".to_string()),
            workspaces: vec![super::VisualAidWorkspace {
                id: "/tmp/project".to_string(),
                cwd: "/tmp/project".to_string(),
                label: "project".to_string(),
                session_path: "/tmp/project/.visual-aid/session.json".to_string(),
                session: VisualAidSession {
                    opened_at: Some("2026-03-14T10:45:00.000Z".to_string()),
                    last_action: "show".to_string(),
                    updated_at: Some("2026-03-14T10:46:00.000Z".to_string()),
                    items: vec![super::VisualAidPayload {
                        version: 1,
                        format: "markdown".to_string(),
                        content: "# Persisted".to_string(),
                        id: None,
                        title: Some("Persisted Session".to_string()),
                        summary: None,
                        mode: Some("replace".to_string()),
                        metadata: None,
                    }],
                },
            }],
        };

        fs::create_dir_all(&root).expect("create temp root");
        fs::write(
            &registry_path,
            serde_json::to_string_pretty(&workspace_state).expect("serialize workspace state"),
        )
        .expect("write workspace state");

        let loaded = read_workspace_state(Some(registry_path.to_string_lossy().into_owned()))
            .expect("load live workspace state");
        let persisted = serde_json::from_str::<VisualAidWorkspaceState>(
            &fs::read_to_string(&persisted_path).expect("read persisted workspace state"),
        )
        .expect("parse persisted workspace state");

        assert_eq!(loaded, workspace_state);
        assert_eq!(persisted, workspace_state);

        cleanup(&root);
    }

    #[test]
    fn vps_restore_001_missing_live_sessions_fall_back_to_the_persisted_snapshot() {
        let root = temp_root();
        let registry_path = root.join("registry.json");
        let persisted_path = persisted_state_path(&registry_path);
        let persisted_workspace_state = VisualAidWorkspaceState {
            active_workspace_id: Some("/tmp/project".to_string()),
            workspaces: vec![super::VisualAidWorkspace {
                id: "/tmp/project".to_string(),
                cwd: "/tmp/project".to_string(),
                label: "project".to_string(),
                session_path: "/tmp/project/.visual-aid/session.json".to_string(),
                session: VisualAidSession {
                    opened_at: Some("2026-03-14T10:47:00.000Z".to_string()),
                    last_action: "show".to_string(),
                    updated_at: Some("2026-03-14T10:48:00.000Z".to_string()),
                    items: vec![super::VisualAidPayload {
                        version: 1,
                        format: "html".to_string(),
                        content: "<article>Recovered</article>".to_string(),
                        id: None,
                        title: Some("Recovered Session".to_string()),
                        summary: None,
                        mode: Some("replace".to_string()),
                        metadata: None,
                    }],
                },
            }],
        };

        fs::create_dir_all(&root).expect("create temp root");
        fs::write(
            &persisted_path,
            serde_json::to_string_pretty(&persisted_workspace_state)
                .expect("serialize persisted workspace state"),
        )
        .expect("write persisted workspace state");

        let restored = read_workspace_state(Some(registry_path.to_string_lossy().into_owned()))
            .expect("restore persisted workspace state");

        assert_eq!(restored, persisted_workspace_state);

        cleanup(&root);
    }

    #[test]
    fn vps_clear_001_clear_sessions_remove_the_persisted_snapshot() {
        let root = temp_root();
        let registry_path = root.join("registry.json");
        let persisted_path = persisted_state_path(&registry_path);
        let cleared_workspace_state = VisualAidWorkspaceState {
            active_workspace_id: Some("/tmp/project".to_string()),
            workspaces: vec![super::VisualAidWorkspace {
                id: "/tmp/project".to_string(),
                cwd: "/tmp/project".to_string(),
                label: "project".to_string(),
                session_path: "/tmp/project/.visual-aid/session.json".to_string(),
                session: VisualAidSession {
                    opened_at: Some("2026-03-14T10:49:00.000Z".to_string()),
                    last_action: "clear".to_string(),
                    updated_at: Some("2026-03-14T10:50:00.000Z".to_string()),
                    items: Vec::new(),
                },
            }],
        };
        let persisted_workspace_state = VisualAidWorkspaceState {
            active_workspace_id: Some("/tmp/project".to_string()),
            workspaces: vec![super::VisualAidWorkspace {
                id: "/tmp/project".to_string(),
                cwd: "/tmp/project".to_string(),
                label: "project".to_string(),
                session_path: "/tmp/project/.visual-aid/session.json".to_string(),
                session: VisualAidSession {
                    opened_at: Some("2026-03-14T10:45:00.000Z".to_string()),
                    last_action: "show".to_string(),
                    updated_at: Some("2026-03-14T10:46:00.000Z".to_string()),
                    items: vec![super::VisualAidPayload {
                        version: 1,
                        format: "markdown".to_string(),
                        content: "# Persisted".to_string(),
                        id: None,
                        title: Some("Persisted Session".to_string()),
                        summary: None,
                        mode: Some("replace".to_string()),
                        metadata: None,
                    }],
                },
            }],
        };

        fs::create_dir_all(&root).expect("create temp root");
        fs::write(
            &registry_path,
            serde_json::to_string_pretty(&cleared_workspace_state)
                .expect("serialize cleared workspace state"),
        )
        .expect("write cleared workspace state");
        fs::write(
            &persisted_path,
            serde_json::to_string_pretty(&persisted_workspace_state)
                .expect("serialize persisted workspace state"),
        )
        .expect("write persisted workspace state");

        let loaded = read_workspace_state(Some(registry_path.to_string_lossy().into_owned()))
            .expect("load cleared workspace state");

        assert_eq!(loaded, cleared_workspace_state);
        assert!(!persisted_path.exists());

        cleanup(&root);
    }

    #[test]
    fn vps_legacy_001_legacy_session_files_are_wrapped_as_workspace_state() {
        let root = temp_root();
        let session_path = root.join(".visual-aid").join("session.json");
        let registry_path = root.join("registry.json");
        let session = VisualAidSession {
            opened_at: Some("2026-03-14T10:45:00.000Z".to_string()),
            last_action: "show".to_string(),
            updated_at: Some("2026-03-14T10:46:00.000Z".to_string()),
            items: vec![super::VisualAidPayload {
                version: 1,
                format: "markdown".to_string(),
                content: "# Persisted".to_string(),
                id: None,
                title: Some("Persisted Session".to_string()),
                summary: None,
                mode: Some("replace".to_string()),
                metadata: None,
            }],
        };

        fs::create_dir_all(session_path.parent().expect("session parent")).expect("create temp root");
        fs::write(
            &session_path,
            serde_json::to_string_pretty(&session).expect("serialize session"),
        )
        .expect("write session");

        env::set_var("VISUAL_AID_SESSION_PATH", &session_path);

        let loaded = read_workspace_state(Some(registry_path.to_string_lossy().into_owned()))
            .expect("load legacy workspace state");
        let expected = workspace_state_from_session(root.clone(), session_path.clone(), session);

        assert_eq!(loaded, expected);

        env::remove_var("VISUAL_AID_SESSION_PATH");
        cleanup(&root);
    }

    #[test]
    fn vpb_watch_001_session_events_match_the_live_session_path() {
        let registry_path = PathBuf::from("/tmp/visual-aid/registry.json");
        let event = Event {
            kind: notify::event::EventKind::Modify(notify::event::ModifyKind::Data(
                notify::event::DataChange::Any,
            )),
            paths: vec![registry_path.clone()],
            attrs: Default::default(),
        };

        assert!(should_handle_state_event(&event, &registry_path));
    }

    #[test]
    fn vpb_watch_002_watch_root_uses_the_session_parent_directory() {
        let registry_path = PathBuf::from("/tmp/visual-aid/registry.json");

        assert_eq!(
            state_watch_root(&registry_path),
            PathBuf::from("/tmp/visual-aid")
        );
    }
}
