use serde::{Deserialize, Serialize};
use tauri::Manager;

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

#[cfg(test)]
mod tests {
    use super::*;

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
        .invoke_handler(tauri::generate_handler![load_custom_registry, save_png])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
