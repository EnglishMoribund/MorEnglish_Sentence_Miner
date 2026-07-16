use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Emitter, Manager};

#[derive(Debug, Deserialize, Serialize)]
pub struct CustomTag {
    id: String,
    label: String,
    def: String,
    #[serde(default)]
    category: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CustomFile {
    #[serde(default)]
    tag: Vec<CustomTag>,
}

#[derive(Debug, Serialize)]
pub struct CustomRegistry {
    path: String,
    tags: Vec<CustomTag>,
}

const TEMPLATE: &str = r#"# MorEnglish Sentence Miner — custom grammar tags
# Add entries like the example below, then File > Custom tags > RELOAD.
#
# [[tag]]
# id = "kenning"
# label = "kenning"
# def = "a compound expression with metaphorical meaning"
# category = "My Tags"    # optional, defaults to "Custom"
"#;

#[tauri::command]
fn load_custom_registry(app: tauri::AppHandle) -> Result<CustomRegistry, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let path = dir.join("registry.toml");
    if !path.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        std::fs::write(&path, TEMPLATE).map_err(|e| e.to_string())?;
    }
    let text = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let parsed: CustomFile = toml::from_str(&text).map_err(|e| e.to_string())?;
    Ok(CustomRegistry {
        path: path.display().to_string(),
        tags: parsed.tag,
    })
}

#[tauri::command]
fn list_fonts() -> Vec<String> {
    let mut db = fontdb::Database::new();
    db.load_system_fonts();
    let mut families: Vec<String> = db
        .faces()
        .filter_map(|f| f.families.first().map(|(name, _)| name.clone()))
        .collect();
    families.sort();
    families.dedup();
    families
}

// ponytail: saves straight to Pictures with a timestamped name — a native
// save-as dialog needs the dialog plugin; add it if people ask to pick paths.
#[tauri::command]
fn save_png(app: tauri::AppHandle, data: Vec<u8>) -> Result<String, String> {
    let dir = app
        .path()
        .picture_dir()
        .or_else(|_| app.path().home_dir())
        .map_err(|e| e.to_string())?;
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();
    let path = dir.join(format!("sentence-diagram-{stamp}.png"));
    std::fs::write(&path, data).map_err(|e| e.to_string())?;
    Ok(path.display().to_string())
}

// Latest UI state, mirrored from the webview via sync_state so the
// localhost API can serve it without asking the frontend.
pub struct SyncedState(Mutex<String>);

// Latest rendered diagram as base64 PNG, mirrored on every render.
pub struct LastRender(Mutex<String>);

#[tauri::command]
fn sync_state(state: tauri::State<SyncedState>, json: String) {
    *state.0.lock().unwrap() = json;
}

#[tauri::command]
fn sync_render(state: tauri::State<LastRender>, png_base64: String) {
    *state.0.lock().unwrap() = png_base64;
}

fn config_path(app: &tauri::AppHandle, file: &str) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(file))
}

#[tauri::command]
fn library_load(app: tauri::AppHandle) -> Result<String, String> {
    let path = config_path(&app, "library.json")?;
    if !path.exists() {
        return Ok("[]".into());
    }
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn library_save(app: tauri::AppHandle, json: String) -> Result<(), String> {
    std::fs::write(config_path(&app, "library.json")?, json).map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PluginEntry {
    name: String,
    command: String,
    #[serde(default)]
    description: Option<String>,
}

#[derive(Debug, Deserialize)]
struct PluginsFile {
    #[serde(default)]
    plugin: Vec<PluginEntry>,
}

#[derive(Debug, Serialize)]
pub struct PluginRegistry {
    path: String,
    plugins: Vec<PluginEntry>,
}

const PLUGINS_TEMPLATE: &str = r#"# MorEnglish Sentence Miner — plugins
# Each entry is a shell command run from PLUGINS > Plugin manager > RUN.
# Plugins drive the app through its loopback API (see plugins/README.md
# in the repo). Put env vars like API keys directly in the command.
#
# [[plugin]]
# name = "Ollama tag suggestions"
# command = "node /path/to/Sentence_Miner/plugins/ollama/suggest.mjs"
# description = "Local AI suggestions via Ollama"
#
# [[plugin]]
# name = "Claude tag suggestions"
# command = "ANTHROPIC_API_KEY=sk-ant-... node /path/to/Sentence_Miner/plugins/anthropic/suggest.mjs"
# description = "Suggestions from the Anthropic API"
"#;

#[tauri::command]
fn load_plugins(app: tauri::AppHandle) -> Result<PluginRegistry, String> {
    let path = config_path(&app, "plugins.toml")?;
    if !path.exists() {
        std::fs::write(&path, PLUGINS_TEMPLATE).map_err(|e| e.to_string())?;
    }
    let text = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let parsed: PluginsFile = toml::from_str(&text).map_err(|e| e.to_string())?;
    Ok(PluginRegistry {
        path: path.display().to_string(),
        plugins: parsed.plugin,
    })
}

// ponytail: blocking run on the command thread pool — plugin runs are rare and short
#[tauri::command]
fn run_plugin(command: String) -> Result<String, String> {
    let out = if cfg!(windows) {
        std::process::Command::new("cmd").args(["/C", &command]).output()
    } else {
        std::process::Command::new("sh").arg("-c").arg(&command).output()
    }
    .map_err(|e| e.to_string())?;
    let mut text = String::from_utf8_lossy(&out.stdout).to_string();
    text.push_str(&String::from_utf8_lossy(&out.stderr));
    let text = text.trim();
    let start = text.char_indices().rev().nth(399).map(|(i, _)| i).unwrap_or(0);
    Ok(format!("{} — {}", out.status, &text[start..]))
}

fn read_library(app: &tauri::AppHandle) -> String {
    config_path(app, "library.json")
        .and_then(|p| std::fs::read_to_string(p).map_err(|e| e.to_string()))
        .unwrap_or_else(|_| "[]".into())
}

pub fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

// Shared secret for the loopback API, persisted so plugins can read it from
// the config dir. Blocks drive-by requests from web pages (custom header
// forces a CORS preflight that never gets approved).
fn load_token(app: &tauri::AppHandle) -> String {
    let path = match config_path(app, "api-token") {
        Ok(p) => p,
        Err(_) => return String::new(),
    };
    if let Ok(t) = std::fs::read_to_string(&path) {
        let t = t.trim().to_string();
        if !t.is_empty() {
            return t;
        }
    }
    let mut bytes = [0u8; 16];
    getrandom::fill(&mut bytes).expect("os rng");
    let token = hex(&bytes);
    let _ = std::fs::write(&path, &token);
    token
}

// Loopback-only HTTP API for external tools (MCP connector, plugins/).
// All requests need the shared token from <config dir>/api-token in an
// x-api-token header. GET /state, /library, /render read mirrored data;
// POST /mine, /tag, /suggest emit events the webview acts on.
// ponytail: fixed port 41337, override with SENTENCE_MINER_PORT if it collides
fn start_api(app: tauri::AppHandle, token: String) {
    std::thread::spawn(move || {
        let port = std::env::var("SENTENCE_MINER_PORT").unwrap_or_else(|_| "41337".into());
        let server = match tiny_http::Server::http(format!("127.0.0.1:{port}")) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("sentence-miner: connector api disabled ({e})");
                return;
            }
        };
        let json_header = || {
            tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap()
        };
        for mut req in server.incoming_requests() {
            let mut body = String::new();
            let _ = req.as_reader().read_to_string(&mut body);

            let authed = req
                .headers()
                .iter()
                .any(|h| h.field.equiv("x-api-token") && h.value.as_str() == token);
            if !authed {
                let _ = req.respond(
                    tiny_http::Response::from_string(
                        r#"{"error":"missing or invalid x-api-token header; token is in the app config dir's api-token file"}"#,
                    )
                    .with_status_code(401)
                    .with_header(json_header()),
                );
                continue;
            }

            // Binary route, answered separately from the JSON ones below
            if req.method().as_str() == "GET" && req.url() == "/render" {
                use base64::Engine;
                let b64 = app.state::<LastRender>().0.lock().unwrap().clone();
                match base64::engine::general_purpose::STANDARD.decode(b64) {
                    Ok(bytes) if !bytes.is_empty() => {
                        let png = tiny_http::Header::from_bytes(
                            &b"Content-Type"[..],
                            &b"image/png"[..],
                        )
                        .unwrap();
                        let _ = req.respond(tiny_http::Response::from_data(bytes).with_header(png));
                    }
                    _ => {
                        let _ = req.respond(
                            tiny_http::Response::from_string(
                                r#"{"error":"nothing rendered yet"}"#,
                            )
                            .with_status_code(404)
                            .with_header(json_header()),
                        );
                    }
                }
                continue;
            }

            let (code, resp) = match (req.method().as_str(), req.url()) {
                ("GET", "/state") => (200, app.state::<SyncedState>().0.lock().unwrap().clone()),
                ("GET", "/library") => (200, read_library(&app)),
                ("POST", "/mine") => {
                    let _ = app.emit("remote-mine", body);
                    (200, r#"{"ok":true}"#.to_string())
                }
                ("POST", "/tag") => {
                    let _ = app.emit("remote-tag", body);
                    (200, r#"{"ok":true}"#.to_string())
                }
                ("POST", "/suggest") => {
                    let _ = app.emit("remote-suggest", body);
                    (200, r#"{"ok":true}"#.to_string())
                }
                _ => (404, r#"{"error":"not found"}"#.to_string()),
            };
            let _ = req.respond(
                tiny_http::Response::from_string(resp)
                    .with_status_code(code)
                    .with_header(json_header()),
            );
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn list_fonts_is_sorted_and_unique() {
        let fonts = list_fonts();
        let mut expected = fonts.clone();
        expected.sort();
        expected.dedup();
        assert_eq!(fonts, expected);
    }

    #[test]
    fn hex_encodes() {
        assert_eq!(hex(&[0x00, 0xff, 0x2a]), "00ff2a");
    }

    #[test]
    fn plugins_template_parses_to_zero_entries() {
        let parsed: PluginsFile = toml::from_str(PLUGINS_TEMPLATE).unwrap();
        assert!(parsed.plugin.is_empty());
    }

    #[test]
    fn plugin_entries_parse() {
        let parsed: PluginsFile = toml::from_str(
            "[[plugin]]\nname = \"x\"\ncommand = \"echo hi\"\ndescription = \"d\"\n",
        )
        .unwrap();
        assert_eq!(parsed.plugin.len(), 1);
        assert_eq!(parsed.plugin[0].command, "echo hi");
    }

    #[test]
    #[cfg(unix)]
    fn run_plugin_captures_output() {
        let out = run_plugin("echo hello-plugin".into()).unwrap();
        assert!(out.contains("hello-plugin"), "{out}");
        assert!(out.contains("exit status: 0"), "{out}");
    }

    #[test]
    fn template_parses_to_zero_tags() {
        let parsed: CustomFile = toml::from_str(TEMPLATE).unwrap();
        assert!(parsed.tag.is_empty());
    }

    #[test]
    fn custom_tags_parse() {
        let parsed: CustomFile = toml::from_str(
            "[[tag]]\nid = \"kenning\"\nlabel = \"kenning\"\ndef = \"a metaphorical compound\"\n\n[[tag]]\nid = \"x\"\nlabel = \"x\"\ndef = \"y\"\ncategory = \"My Tags\"\n",
        )
        .unwrap();
        assert_eq!(parsed.tag.len(), 2);
        assert_eq!(parsed.tag[0].category, None);
        assert_eq!(parsed.tag[1].category.as_deref(), Some("My Tags"));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(SyncedState(Mutex::new("{}".into())))
        .manage(LastRender(Mutex::new(String::new())))
        .setup(|app| {
            let token = load_token(app.handle());
            start_api(app.handle().clone(), token);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_custom_registry,
            save_png,
            list_fonts,
            sync_state,
            sync_render,
            library_load,
            library_save,
            load_plugins,
            run_plugin
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
