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

fn default_session_path() -> Result<PathBuf, String> {
    if let Ok(path) = env::var("VISUAL_AID_SESSION_PATH") {
        return Ok(PathBuf::from(path));
    }

    let cwd = env::current_dir().map_err(|error| error.to_string())?;
    Ok(cwd.join(".visual-aid").join("session.json"))
}

fn persisted_session_path(session_path: &Path) -> PathBuf {
    let file_stem = session_path
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or("session");
    let file_name = format!("{file_stem}.persisted.json");

    session_path
        .parent()
        .map(|parent| parent.join(&file_name))
        .unwrap_or_else(|| PathBuf::from(file_name))
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

fn should_persist_session(session: &VisualAidSession) -> bool {
    session.last_action == "show" && !session.items.is_empty()
}

fn write_persisted_session(path: &Path, session: &VisualAidSession) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let json = serde_json::to_string_pretty(session).map_err(|error| error.to_string())?;
    fs::write(path, json).map_err(|error| error.to_string())
}

fn remove_persisted_session(path: &Path) -> Result<(), String> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

fn session_watch_root(session_path: &Path) -> PathBuf {
    session_path
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from("."))
}

fn should_handle_session_event(event: &Event, session_path: &Path) -> bool {
    event.paths.iter().any(|path| path == session_path)
}

fn emit_session_update<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    session_path: &Path,
) -> Result<(), String> {
    let session = read_session_state(Some(session_path.to_string_lossy().into_owned()))?;
    app.emit(SESSION_UPDATED_EVENT, session)
        .map_err(|error| error.to_string())
}

fn start_session_bridge_watcher<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    let session_path = default_session_path()?;
    let watch_root = session_watch_root(&session_path);

    if let Some(parent) = session_path.parent() {
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

            if !should_handle_session_event(&event, &session_path) {
                continue;
            }

            if let Err(error) = emit_session_update(&app, &session_path) {
                eprintln!("visual-aid session emit failed: {error}");
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn read_session_state(session_path: Option<String>) -> Result<VisualAidSession, String> {
    let path = session_path
        .map(PathBuf::from)
        .map(Ok)
        .unwrap_or_else(default_session_path)?;
    let persisted_path = persisted_session_path(&path);

    match read_session_file(&path) {
        Ok(Some(session)) => {
            if should_persist_session(&session) {
                write_persisted_session(&persisted_path, &session)?;
            } else if session.last_action == "clear" {
                remove_persisted_session(&persisted_path)?;
            }

            Ok(session)
        }
        Ok(None) | Err(_) => read_session_file(&persisted_path)?
            .ok_or_else(|| "missing persisted session".to_string())
            .or_else(|_| Ok(VisualAidSession::default())),
    }
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
        .invoke_handler(tauri::generate_handler![read_session_state])
        .run(tauri::generate_context!())
        .expect("failed to run visual-aid application");
}

#[cfg(test)]
mod tests {
    use super::{
        focus_existing_window, persisted_session_path, read_session_state, session_watch_root,
        should_handle_session_event, FocusableWindow, VisualAidSession,
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
        let session_path = root.join("session.json");
        let persisted_path = persisted_session_path(&session_path);
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

        fs::create_dir_all(&root).expect("create temp root");
        fs::write(
            &session_path,
            serde_json::to_string_pretty(&session).expect("serialize session"),
        )
        .expect("write session");

        let loaded = read_session_state(Some(session_path.to_string_lossy().into_owned()))
            .expect("load live session");
        let persisted = serde_json::from_str::<VisualAidSession>(
            &fs::read_to_string(&persisted_path).expect("read persisted session"),
        )
        .expect("parse persisted session");

        assert_eq!(loaded, session);
        assert_eq!(persisted, session);

        cleanup(&root);
    }

    #[test]
    fn vps_restore_001_missing_live_sessions_fall_back_to_the_persisted_snapshot() {
        let root = temp_root();
        let session_path = root.join("session.json");
        let persisted_path = persisted_session_path(&session_path);
        let persisted_session = VisualAidSession {
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
        };

        fs::create_dir_all(&root).expect("create temp root");
        fs::write(
            &persisted_path,
            serde_json::to_string_pretty(&persisted_session).expect("serialize persisted session"),
        )
        .expect("write persisted session");

        let restored = read_session_state(Some(session_path.to_string_lossy().into_owned()))
            .expect("restore persisted session");

        assert_eq!(restored, persisted_session);

        cleanup(&root);
    }

    #[test]
    fn vps_clear_001_clear_sessions_remove_the_persisted_snapshot() {
        let root = temp_root();
        let session_path = root.join("session.json");
        let persisted_path = persisted_session_path(&session_path);
        let cleared_session = VisualAidSession {
            opened_at: Some("2026-03-14T10:49:00.000Z".to_string()),
            last_action: "clear".to_string(),
            updated_at: Some("2026-03-14T10:50:00.000Z".to_string()),
            items: Vec::new(),
        };
        let persisted_session = VisualAidSession {
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

        fs::create_dir_all(&root).expect("create temp root");
        fs::write(
            &session_path,
            serde_json::to_string_pretty(&cleared_session).expect("serialize cleared session"),
        )
        .expect("write cleared session");
        fs::write(
            &persisted_path,
            serde_json::to_string_pretty(&persisted_session).expect("serialize persisted session"),
        )
        .expect("write persisted session");

        let loaded = read_session_state(Some(session_path.to_string_lossy().into_owned()))
            .expect("load cleared session");

        assert_eq!(loaded, cleared_session);
        assert!(!persisted_path.exists());

        cleanup(&root);
    }

    #[test]
    fn vpb_watch_001_session_events_match_the_live_session_path() {
        let session_path = PathBuf::from("/tmp/visual-aid/session.json");
        let event = Event {
            kind: notify::event::EventKind::Modify(notify::event::ModifyKind::Data(
                notify::event::DataChange::Any,
            )),
            paths: vec![session_path.clone()],
            attrs: Default::default(),
        };

        assert!(should_handle_session_event(&event, &session_path));
    }

    #[test]
    fn vpb_watch_002_watch_root_uses_the_session_parent_directory() {
        let session_path = PathBuf::from("/tmp/visual-aid/session.json");

        assert_eq!(
            session_watch_root(&session_path),
            PathBuf::from("/tmp/visual-aid")
        );
    }
}
