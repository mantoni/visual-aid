#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
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
    language: Option<String>,
    mode: Option<String>,
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

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VisualAidWorkspaceRegistryEntry {
    id: String,
    cwd: String,
    label: String,
    session_path: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VisualAidWorkspaceRegistryState {
    active_workspace_id: Option<String>,
    workspaces: Vec<VisualAidWorkspaceRegistryEntry>,
}

impl Default for VisualAidWorkspaceRegistryState {
    fn default() -> Self {
        Self {
            active_workspace_id: None,
            workspaces: Vec::new(),
        }
    }
}

fn registry_state_from_workspace_state(
    workspace_state: &VisualAidWorkspaceState,
) -> VisualAidWorkspaceRegistryState {
    VisualAidWorkspaceRegistryState {
        active_workspace_id: workspace_state.active_workspace_id.clone(),
        workspaces: workspace_state
            .workspaces
            .iter()
            .map(|workspace| VisualAidWorkspaceRegistryEntry {
                id: workspace.id.clone(),
                cwd: workspace.cwd.clone(),
                label: workspace.label.clone(),
                session_path: workspace.session_path.clone(),
            })
            .collect(),
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
        return Ok(PathBuf::from(home)
            .join(".visual-aid")
            .join("registry.json"));
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
        return parent.parent().map(Path::to_path_buf).unwrap_or(parent);
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

fn read_registry_state_file(
    path: &Path,
) -> Result<Option<VisualAidWorkspaceRegistryState>, String> {
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

fn write_registry_state_file(
    path: &Path,
    value: &VisualAidWorkspaceRegistryState,
) -> Result<(), String> {
    write_persisted_state(path, value)
}

fn remove_file_if_exists(path: &Path) -> Result<(), String> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

fn remove_persisted_state(path: &Path) -> Result<(), String> {
    remove_file_if_exists(path)
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

fn resolve_workspace_session(
    workspace: &VisualAidWorkspaceRegistryEntry,
    persisted_workspace_state: Option<&VisualAidWorkspaceState>,
) -> VisualAidSession {
    let session_path = Path::new(&workspace.session_path);

    if let Ok(Some(session)) = read_session_file(session_path) {
        return session;
    }

    persisted_workspace_state
        .and_then(|workspace_state| {
            workspace_state
                .workspaces
                .iter()
                .find(|entry| {
                    entry.id == workspace.id && entry.session_path == workspace.session_path
                })
                .map(|entry| entry.session.clone())
        })
        .unwrap_or_default()
}

fn assemble_workspace_state(
    registry_state: &VisualAidWorkspaceRegistryState,
    persisted_workspace_state: Option<&VisualAidWorkspaceState>,
) -> VisualAidWorkspaceState {
    let workspaces = registry_state
        .workspaces
        .iter()
        .map(|workspace| VisualAidWorkspace {
            id: workspace.id.clone(),
            cwd: workspace.cwd.clone(),
            label: workspace.label.clone(),
            session_path: workspace.session_path.clone(),
            session: resolve_workspace_session(workspace, persisted_workspace_state),
        })
        .collect::<Vec<_>>();
    let active_workspace_id = registry_state
        .active_workspace_id
        .as_ref()
        .filter(|workspace_id| workspaces.iter().any(|entry| &entry.id == *workspace_id))
        .cloned()
        .or_else(|| workspaces.first().map(|workspace| workspace.id.clone()));

    VisualAidWorkspaceState {
        active_workspace_id,
        workspaces,
    }
}

fn remove_workspace_from_registry_state(
    registry_state: &VisualAidWorkspaceRegistryState,
    workspace_id: &str,
) -> (
    VisualAidWorkspaceRegistryState,
    Option<VisualAidWorkspaceRegistryEntry>,
) {
    let existing_index = registry_state
        .workspaces
        .iter()
        .position(|workspace| workspace.id == workspace_id);

    let Some(existing_index) = existing_index else {
        return (registry_state.clone(), None);
    };

    let mut workspaces = registry_state.workspaces.clone();
    let removed_workspace = workspaces.remove(existing_index);
    let active_workspace_id = if registry_state.active_workspace_id.as_deref() == Some(workspace_id)
        || !workspaces.iter().any(|workspace| {
            registry_state
                .active_workspace_id
                .as_deref()
                .is_some_and(|active_workspace_id| workspace.id == active_workspace_id)
        }) {
        workspaces
            .get(existing_index)
            .or_else(|| workspaces.get(existing_index.saturating_sub(1)))
            .map(|workspace| workspace.id.clone())
    } else {
        registry_state.active_workspace_id.clone()
    };

    (
        VisualAidWorkspaceRegistryState {
            active_workspace_id,
            workspaces,
        },
        Some(removed_workspace),
    )
}

fn read_legacy_workspace_state(
    session_path: &Path,
) -> Result<Option<VisualAidWorkspaceState>, String> {
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
    let persisted_workspace_state = read_workspace_state_file(&persisted_path)?;

    match read_registry_state_file(&path) {
        Ok(Some(registry_state)) => {
            let workspace_state =
                assemble_workspace_state(&registry_state, persisted_workspace_state.as_ref());

            if should_persist_workspace_state(&workspace_state) {
                write_persisted_state(&persisted_path, &workspace_state)?;
            } else {
                remove_persisted_state(&persisted_path)?;
            }

            Ok(workspace_state)
        }
        Ok(None) | Err(_) => {
            if let Some(persisted_workspace_state) = persisted_workspace_state {
                return Ok(persisted_workspace_state);
            }

            if let Some(legacy_workspace_state) = read_legacy_workspace_state(&legacy_session_path)?
            {
                return Ok(legacy_workspace_state);
            }

            Ok(VisualAidWorkspaceState::default())
        }
    }
}

#[tauri::command]
fn close_workspace(
    workspace_id: String,
    registry_path: Option<String>,
) -> Result<VisualAidWorkspaceState, String> {
    let path = registry_path
        .map(PathBuf::from)
        .map(Ok)
        .unwrap_or_else(default_registry_path)?;
    let persisted_path = persisted_state_path(&path);
    let persisted_workspace_state = read_workspace_state_file(&persisted_path)?;
    let registry_state = read_registry_state_file(&path)?
        .or_else(|| {
            persisted_workspace_state
                .as_ref()
                .map(registry_state_from_workspace_state)
        })
        .unwrap_or_default();
    let (next_registry_state, removed_workspace) =
        remove_workspace_from_registry_state(&registry_state, &workspace_id);

    if let Some(workspace) = removed_workspace {
        remove_file_if_exists(Path::new(&workspace.session_path))?;
    }

    write_registry_state_file(&path, &next_registry_state)?;

    let workspace_state =
        assemble_workspace_state(&next_registry_state, persisted_workspace_state.as_ref());

    if should_persist_workspace_state(&workspace_state) {
        write_persisted_state(&persisted_path, &workspace_state)?;
    } else {
        remove_persisted_state(&persisted_path)?;
    }

    Ok(workspace_state)
}

#[tauri::command]
fn read_session_state(session_path: Option<String>) -> Result<VisualAidSession, String> {
    let path = session_path
        .map(PathBuf::from)
        .map(Ok)
        .unwrap_or_else(default_session_path)?;
    let persisted_workspace_state =
        read_workspace_state_file(&persisted_state_path(&default_registry_path()?))?;

    if let Ok(Some(session)) = read_session_file(&path) {
        return Ok(session);
    }

    let target_path = path.to_string_lossy().into_owned();
    if let Some(session) = persisted_workspace_state
        .as_ref()
        .and_then(|workspace_state| {
            workspace_state
                .workspaces
                .iter()
                .find(|workspace| workspace.session_path == target_path)
                .map(|workspace| workspace.session.clone())
        })
    {
        return Ok(session);
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
            close_workspace,
            read_session_state,
            read_workspace_state
        ])
        .run(tauri::generate_context!())
        .expect("failed to run visual-aid application");
}

#[cfg(test)]
mod tests {
    use super::{
        close_workspace, focus_existing_window, persisted_state_path, read_workspace_state,
        should_handle_state_event, state_watch_root, workspace_state_from_session, FocusableWindow,
        VisualAidSession, VisualAidWorkspaceRegistryEntry, VisualAidWorkspaceRegistryState,
        VisualAidWorkspaceState,
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

    fn sample_session(format: &str, content: &str) -> VisualAidSession {
        VisualAidSession {
            opened_at: Some("2026-03-14T10:45:00.000Z".to_string()),
            last_action: "show".to_string(),
            updated_at: Some("2026-03-14T10:46:00.000Z".to_string()),
            items: vec![super::VisualAidPayload {
                version: 1,
                format: format.to_string(),
                content: content.to_string(),
                id: None,
                title: Some("Persisted Session".to_string()),
                summary: None,
                language: None,
                mode: Some("replace".to_string()),
            }],
        }
    }

    fn registry_state(cwd: &str, session_path: &Path) -> VisualAidWorkspaceRegistryState {
        VisualAidWorkspaceRegistryState {
            active_workspace_id: Some(cwd.to_string()),
            workspaces: vec![VisualAidWorkspaceRegistryEntry {
                id: cwd.to_string(),
                cwd: cwd.to_string(),
                label: Path::new(cwd)
                    .file_name()
                    .and_then(|name| name.to_str())
                    .unwrap_or(cwd)
                    .to_string(),
                session_path: session_path.to_string_lossy().into_owned(),
            }],
        }
    }

    fn registry_entry(cwd: &str, session_path: &Path) -> VisualAidWorkspaceRegistryEntry {
        VisualAidWorkspaceRegistryEntry {
            id: cwd.to_string(),
            cwd: cwd.to_string(),
            label: Path::new(cwd)
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or(cwd)
                .to_string(),
            session_path: session_path.to_string_lossy().into_owned(),
        }
    }

    #[test]
    fn vps_persist_001_non_empty_show_sessions_are_persisted() {
        let root = temp_root();
        let registry_path = root.join("registry.json");
        let session_path = root.join(".visual-aid").join("session.json");
        let persisted_path = persisted_state_path(&registry_path);
        let registry_state = registry_state("/tmp/project", &session_path);
        let workspace_state = workspace_state_from_session(
            PathBuf::from("/tmp/project"),
            session_path.clone(),
            sample_session("markdown", "# Persisted"),
        );

        fs::create_dir_all(session_path.parent().expect("session parent"))
            .expect("create temp root");
        fs::write(
            &session_path,
            serde_json::to_string_pretty(&workspace_state.workspaces[0].session)
                .expect("serialize session"),
        )
        .expect("write session");
        fs::write(
            &registry_path,
            serde_json::to_string_pretty(&registry_state).expect("serialize registry state"),
        )
        .expect("write registry state");

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
                        language: None,
                        mode: Some("replace".to_string()),
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
        let session_path = root.join(".visual-aid").join("session.json");
        let persisted_path = persisted_state_path(&registry_path);
        let registry_state = registry_state("/tmp/project", &session_path);
        let cleared_workspace_state = VisualAidWorkspaceState {
            active_workspace_id: Some("/tmp/project".to_string()),
            workspaces: vec![super::VisualAidWorkspace {
                id: "/tmp/project".to_string(),
                cwd: "/tmp/project".to_string(),
                label: "project".to_string(),
                session_path: session_path.to_string_lossy().into_owned(),
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
                        language: None,
                        mode: Some("replace".to_string()),
                    }],
                },
            }],
        };

        fs::create_dir_all(session_path.parent().expect("session parent"))
            .expect("create temp root");
        fs::write(
            &session_path,
            serde_json::to_string_pretty(&cleared_workspace_state.workspaces[0].session)
                .expect("serialize cleared session"),
        )
        .expect("write cleared session");
        fs::write(
            &registry_path,
            serde_json::to_string_pretty(&registry_state).expect("serialize registry state"),
        )
        .expect("write registry state");
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
    fn vwt_tabs_004_closing_a_workspace_tab_deletes_its_session_and_reveals_another_workspace() {
        let root = temp_root();
        let registry_path = root.join("registry.json");
        let persisted_path = persisted_state_path(&registry_path);
        let session_one_path = root.join("one").join(".visual-aid").join("session.json");
        let session_two_path = root.join("two").join(".visual-aid").join("session.json");
        let session_three_path = root.join("three").join(".visual-aid").join("session.json");
        let registry_state = VisualAidWorkspaceRegistryState {
            active_workspace_id: Some("/tmp/project-two".to_string()),
            workspaces: vec![
                registry_entry("/tmp/project-one", &session_one_path),
                registry_entry("/tmp/project-two", &session_two_path),
                registry_entry("/tmp/project-three", &session_three_path),
            ],
        };
        let persisted_workspace_state = VisualAidWorkspaceState {
            active_workspace_id: Some("/tmp/project-two".to_string()),
            workspaces: vec![
                super::VisualAidWorkspace {
                    id: "/tmp/project-one".to_string(),
                    cwd: "/tmp/project-one".to_string(),
                    label: "project-one".to_string(),
                    session_path: session_one_path.to_string_lossy().into_owned(),
                    session: sample_session("markdown", "# One"),
                },
                super::VisualAidWorkspace {
                    id: "/tmp/project-two".to_string(),
                    cwd: "/tmp/project-two".to_string(),
                    label: "project-two".to_string(),
                    session_path: session_two_path.to_string_lossy().into_owned(),
                    session: sample_session("html", "<section>Two</section>"),
                },
                super::VisualAidWorkspace {
                    id: "/tmp/project-three".to_string(),
                    cwd: "/tmp/project-three".to_string(),
                    label: "project-three".to_string(),
                    session_path: session_three_path.to_string_lossy().into_owned(),
                    session: sample_session("code", "const three = true;"),
                },
            ],
        };

        fs::create_dir_all(session_one_path.parent().expect("session parent"))
            .expect("create session parent");
        fs::create_dir_all(session_two_path.parent().expect("session parent"))
            .expect("create session parent");
        fs::create_dir_all(session_three_path.parent().expect("session parent"))
            .expect("create session parent");
        fs::write(
            &session_one_path,
            serde_json::to_string_pretty(&persisted_workspace_state.workspaces[0].session)
                .expect("serialize session one"),
        )
        .expect("write session one");
        fs::write(
            &session_two_path,
            serde_json::to_string_pretty(&persisted_workspace_state.workspaces[1].session)
                .expect("serialize session two"),
        )
        .expect("write session two");
        fs::write(
            &session_three_path,
            serde_json::to_string_pretty(&persisted_workspace_state.workspaces[2].session)
                .expect("serialize session three"),
        )
        .expect("write session three");
        fs::write(
            &registry_path,
            serde_json::to_string_pretty(&registry_state).expect("serialize registry state"),
        )
        .expect("write registry state");
        fs::write(
            &persisted_path,
            serde_json::to_string_pretty(&persisted_workspace_state)
                .expect("serialize persisted workspace state"),
        )
        .expect("write persisted workspace state");

        let next = close_workspace(
            "/tmp/project-two".to_string(),
            Some(registry_path.to_string_lossy().into_owned()),
        )
        .expect("close active workspace");

        assert_eq!(next.workspaces.len(), 2);
        assert!(next
            .workspaces
            .iter()
            .all(|workspace| workspace.id != "/tmp/project-two"));
        assert_eq!(
            next.active_workspace_id.as_deref(),
            Some("/tmp/project-three")
        );
        assert!(!session_two_path.exists());
        assert!(session_one_path.exists());
        assert!(session_three_path.exists());

        let persisted = serde_json::from_str::<VisualAidWorkspaceState>(
            &fs::read_to_string(&persisted_path).expect("read persisted workspace state"),
        )
        .expect("parse persisted workspace state");
        assert_eq!(persisted, next);

        cleanup(&root);
    }

    #[test]
    fn vwt_tabs_005_closing_the_last_workspace_tab_clears_the_window_state() {
        let root = temp_root();
        let registry_path = root.join("registry.json");
        let persisted_path = persisted_state_path(&registry_path);
        let session_path = root.join(".visual-aid").join("session.json");
        let registry_state = registry_state("/tmp/project", &session_path);
        let workspace_state = workspace_state_from_session(
            PathBuf::from("/tmp/project"),
            session_path.clone(),
            sample_session("markdown", "# One"),
        );

        fs::create_dir_all(session_path.parent().expect("session parent"))
            .expect("create temp root");
        fs::write(
            &session_path,
            serde_json::to_string_pretty(&workspace_state.workspaces[0].session)
                .expect("serialize session"),
        )
        .expect("write session");
        fs::write(
            &registry_path,
            serde_json::to_string_pretty(&registry_state).expect("serialize registry state"),
        )
        .expect("write registry state");
        fs::write(
            &persisted_path,
            serde_json::to_string_pretty(&workspace_state)
                .expect("serialize persisted workspace state"),
        )
        .expect("write persisted workspace state");

        let next = close_workspace(
            "/tmp/project".to_string(),
            Some(registry_path.to_string_lossy().into_owned()),
        )
        .expect("close last workspace");

        assert_eq!(next, VisualAidWorkspaceState::default());
        assert!(!session_path.exists());
        assert!(!persisted_path.exists());

        let registry = serde_json::from_str::<VisualAidWorkspaceRegistryState>(
            &fs::read_to_string(&registry_path).expect("read registry state"),
        )
        .expect("parse registry state");
        assert_eq!(registry, VisualAidWorkspaceRegistryState::default());

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
                language: None,
                mode: Some("replace".to_string()),
            }],
        };

        fs::create_dir_all(session_path.parent().expect("session parent"))
            .expect("create temp root");
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
    fn vps_restore_002_live_registry_entries_use_persisted_sessions_when_session_files_are_missing()
    {
        let root = temp_root();
        let registry_path = root.join("registry.json");
        let session_path = root.join(".visual-aid").join("session.json");
        let persisted_path = persisted_state_path(&registry_path);
        let registry_state = registry_state("/tmp/project", &session_path);
        let persisted_workspace_state = workspace_state_from_session(
            PathBuf::from("/tmp/project"),
            session_path.clone(),
            sample_session("html", "<article>Recovered</article>"),
        );

        fs::create_dir_all(&root).expect("create temp root");
        fs::write(
            &registry_path,
            serde_json::to_string_pretty(&registry_state).expect("serialize registry state"),
        )
        .expect("write registry state");
        fs::write(
            &persisted_path,
            serde_json::to_string_pretty(&persisted_workspace_state)
                .expect("serialize persisted workspace state"),
        )
        .expect("write persisted workspace state");

        let restored = read_workspace_state(Some(registry_path.to_string_lossy().into_owned()))
            .expect("restore persisted workspace session");

        assert_eq!(restored, persisted_workspace_state);

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
