#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{collections::HashMap, env, fs, path::PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{Manager, WebviewWindow};

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[tauri::command]
fn read_session_state(session_path: Option<String>) -> Result<VisualAidSession, String> {
    let path = session_path
        .map(PathBuf::from)
        .map(Ok)
        .unwrap_or_else(default_session_path)?;

    if !path.exists() {
        return Ok(VisualAidSession::default());
    }

    let raw = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&raw).map_err(|error| error.to_string())
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
    use super::{focus_existing_window, FocusableWindow};
    use std::cell::RefCell;

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
}
