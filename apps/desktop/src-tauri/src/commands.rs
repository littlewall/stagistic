use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager;

#[tauri::command]
pub fn ping() -> String {
    "pong".to_string()
}

/// Safe shutdown: while `ready`, the frontend runs the save-and-backup
/// sequence before the app really exits; otherwise closing exits directly.
#[derive(Default)]
pub struct ShutdownState {
    ready: AtomicBool,
    exiting: AtomicBool,
}

impl ShutdownState {
    /// A reloading page has no listener yet, so closing must not wait for it.
    pub fn reset(&self) {
        self.ready.store(false, Ordering::SeqCst);
    }

    /// True when a close or quit request must be handed to the frontend.
    pub fn should_intercept(&self) -> bool {
        self.ready.load(Ordering::SeqCst) && !self.exiting.load(Ordering::SeqCst)
    }
}

pub const SHUTDOWN_EVENT: &str = "stagistic:shutdown-requested";

#[tauri::command]
pub fn desktop_shutdown_ready(state: tauri::State<'_, ShutdownState>, ready: bool) {
    state.ready.store(ready, Ordering::SeqCst);
}

/// The real exit; marked so the resulting exit/close events are not intercepted again.
#[tauri::command]
pub fn desktop_exit(app: tauri::AppHandle, state: tauri::State<'_, ShutdownState>) {
    state.exiting.store(true, Ordering::SeqCst);
    app.exit(0);
}

#[tauri::command]
pub fn desktop_relaunch(app: tauri::AppHandle, state: tauri::State<'_, ShutdownState>) {
    state.exiting.store(true, Ordering::SeqCst);
    // `restart` skips RunEvent::Exit, so stop the MCP broker here.
    if let Some(mcp) = app.try_state::<std::sync::Arc<stagistic_editor::mcp::commands::McpState>>()
    {
        tauri::async_runtime::block_on(mcp.broker.disable());
    }
    app.restart();
}

/// Opens a folder in the app data folder in Finder; creates it first so the
/// button works before the first file exists.
fn show_app_data_folder(app: &tauri::AppHandle, name: &str) -> Result<(), String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join(name);
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    tauri_plugin_opener::open_path(dir, None::<&str>).map_err(|error| error.to_string())
}

/// Opens the app data `backups/` folder in Finder.
#[tauri::command]
pub fn desktop_show_backups_folder(app: tauri::AppHandle) -> Result<(), String> {
    show_app_data_folder(&app, "backups")
}

/// Opens the app data `attachments/` folder in Finder.
#[tauri::command]
pub fn desktop_show_attachments_folder(app: tauri::AppHandle) -> Result<(), String> {
    show_app_data_folder(&app, "attachments")
}

/// A backup file the writer picked outside the backups folder, copied into
/// the app data folder so the page can check and stage it.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedBackup {
    /// The picked file's name, shown in the confirmation.
    file_name: String,
    /// The picked file's modification time, in ms since the Unix epoch.
    modified_ms: Option<u64>,
}

/// Where the picked file is copied, relative to the app data folder.
pub const IMPORTED_BACKUP: &str = "restore/import.pgdata.gz";

/// Opens a native Open dialog for a backup file and copies the chosen file to
/// `restore/import.pgdata.gz`. Returns `None` when the dialog is cancelled.
/// The page never gets the path, so the file system scope stays the app data folder.
#[tauri::command]
pub async fn desktop_import_backup_file(
    app: tauri::AppHandle,
) -> Result<Option<ImportedBackup>, String> {
    use tauri_plugin_dialog::DialogExt;

    let Some(picked) = app
        .dialog()
        .file()
        .set_title("Restore from File")
        .add_filter("Stagistic backup", &["gz"])
        .blocking_pick_file()
    else {
        return Ok(None);
    };
    let source = picked.into_path().map_err(|error| error.to_string())?;
    let target = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join(IMPORTED_BACKUP);
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    std::fs::copy(&source, &target).map_err(|error| error.to_string())?;
    let modified_ms = std::fs::metadata(&source)
        .and_then(|metadata| metadata.modified())
        .ok()
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .and_then(|duration| u64::try_from(duration.as_millis()).ok());
    let file_name = source
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_default();

    Ok(Some(ImportedBackup {
        file_name,
        modified_ms,
    }))
}

/// Opens the fixed download page in the default browser, for the
/// "database newer than app" screen. No caller-supplied URL.
#[tauri::command]
pub fn desktop_open_download_page() -> Result<(), String> {
    tauri_plugin_opener::open_url("https://stagistic.com/download", None::<&str>)
        .map_err(|error| error.to_string())
}

/// True for an `https://` URL with a host; the only links the app opens.
fn is_openable_url(url: &str) -> bool {
    url.strip_prefix("https://").is_some_and(|rest| {
        !rest.is_empty() && !rest.starts_with('/') && !url.chars().any(char::is_control)
    })
}

/// Opens an external `https` link in the default browser. Other schemes are
/// refused so a page cannot launch files or other apps.
#[tauri::command]
pub fn desktop_open_external_url(url: String) -> Result<(), String> {
    if !is_openable_url(&url) {
        return Err("Only https links can be opened".to_string());
    }
    tauri_plugin_opener::open_url(url, None::<&str>).map_err(|error| error.to_string())
}

/// Enables the Script menu items while a script is open (reported by the frontend on route change).
#[tauri::command]
pub fn desktop_set_menu_context(app: tauri::AppHandle, in_script: bool) -> Result<(), String> {
    crate::menu::set_script_context(&app, in_script)
}

/// Bundled resource holding the third-party licences (generated by `scripts/licenses.mjs`).
const LICENSES_RESOURCE: &str = "licenses/THIRD_PARTY_LICENSES.txt";

fn licenses_path(resource_dir: &std::path::Path) -> std::path::PathBuf {
    resource_dir.join(LICENSES_RESOURCE)
}

/// Opens the bundled third-party licence file in the default text viewer.
#[tauri::command]
pub fn desktop_open_licenses(app: tauri::AppHandle) -> Result<(), String> {
    let path = licenses_path(
        &app.path()
            .resource_dir()
            .map_err(|error| error.to_string())?,
    );
    if !path.is_file() {
        log::error!("Licence file missing: {}", path.display());
        return Err("The licence file is missing".to_string());
    }
    tauri_plugin_opener::open_path(path, None::<&str>).map_err(|error| error.to_string())
}

#[cfg(test)]
mod licenses_tests {
    use super::licenses_path;
    use std::path::Path;

    #[test]
    fn resolves_inside_the_resource_dir() {
        assert_eq!(
            licenses_path(Path::new("/App/Contents/Resources")),
            Path::new("/App/Contents/Resources/licenses/THIRD_PARTY_LICENSES.txt")
        );
    }
}

#[cfg(test)]
mod open_url_tests {
    use super::is_openable_url;

    #[test]
    fn accepts_https_only() {
        assert!(is_openable_url("https://feedback.stagistic.com/"));
        assert!(!is_openable_url("http://example.com"));
        assert!(!is_openable_url("file:///etc/passwd"));
        assert!(!is_openable_url("https:///x"));
        assert!(!is_openable_url("javascript:alert(1)"));
    }
}
