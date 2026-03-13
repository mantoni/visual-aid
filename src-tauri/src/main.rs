#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{collections::HashMap, env, fs, path::PathBuf};

use serde::{Deserialize, Serialize};

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

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_session_state])
        .run(tauri::generate_context!())
        .expect("failed to run visual-aid application");
}
