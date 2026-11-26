//! Native menu: layout, action ids, Script-menu context and page zoom.
//!
//! Action ids are surface-neutral strings (`area.action`) so a later Windows
//! menu reuses them. The frontend ids below are mirrored in
//! `src/menu/menuActions.ts`; `menuActions.test.ts` fails when they drift.

use std::sync::Mutex;

use tauri::{
    menu::{Menu, MenuItem, MenuItemKind, PredefinedMenuItem, Submenu},
    Emitter, Manager,
};

pub const MENU_EVENT_NAME: &str = "menu-action";

// Custom Quit: the predefined item calls `terminate:` directly, which tao reports
// only as `Exit` (no `ExitRequested`), so ⌘Q would skip the safe-shutdown sequence.
pub const MENU_ID_QUIT: &str = "app.quit";

// Zoom runs in Rust (webview zoom), so these ids never reach the frontend.
pub const MENU_ID_ZOOM_IN: &str = "view.zoom-in";
pub const MENU_ID_ZOOM_OUT: &str = "view.zoom-out";
pub const MENU_ID_ZOOM_RESET: &str = "view.zoom-reset";

const SCRIPT_SUBMENU_ID: &str = "script-menu";

macro_rules! frontend_actions {
    ($($name:ident = $id:literal),* $(,)?) => {
        $(pub const $name: &str = $id;)*
        /// Ids emitted to the frontend as `menu-action` payloads.
        pub const FRONTEND_ACTIONS: &[&str] = &[$($id),*];
    };
}

frontend_actions! {
    APP_CHECK_UPDATES = "app.check-updates",
    APP_SETTINGS = "app.settings",
    FILE_NEW_SCRIPT = "file.new-script",
    FILE_IMPORT = "file.import",
    FILE_SCRIPT_LIBRARY = "file.script-library",
    EDIT_UNDO = "edit.undo",
    EDIT_REDO = "edit.redo",
    SCRIPT_SETTINGS = "script.settings",
    SCRIPT_ATTRIBUTES = "script.attributes",
    SCRIPT_EXPORT = "script.export",
    SCRIPT_SAVE = "script.save",
    HELP_DOCS = "help.docs",
    HELP_WHATS_NEW = "help.whats-new",
    HELP_CHANGELOG = "help.changelog",
    HELP_REPORT_PROBLEM = "help.report-problem",
    HELP_BACKUPS_FOLDER = "help.backups-folder",
    HELP_LICENSES = "help.licenses",
}

pub const ZOOM_MIN: f64 = 0.5;
pub const ZOOM_MAX: f64 = 3.0;
const ZOOM_STEP: f64 = 0.1;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ZoomAction {
    In,
    Out,
    Reset,
}

/// The zoom level after `action`, in 10% steps within 50%–300%.
pub fn next_zoom(current: f64, action: ZoomAction) -> f64 {
    let target = match action {
        ZoomAction::In => current + ZOOM_STEP,
        ZoomAction::Out => current - ZOOM_STEP,
        ZoomAction::Reset => 1.0,
    };
    ((target * 100.0).round() / 100.0).clamp(ZOOM_MIN, ZOOM_MAX)
}

/// Current page zoom of the main window (1.0 = actual size).
pub struct ZoomState(Mutex<f64>);

impl Default for ZoomState {
    fn default() -> Self {
        Self(Mutex::new(1.0))
    }
}

fn apply_zoom<R: tauri::Runtime>(app: &tauri::AppHandle<R>, action: ZoomAction) {
    let Some(state) = app.try_state::<ZoomState>() else {
        return;
    };
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let mut level = state
        .0
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    let next = next_zoom(*level, action);
    match window.set_zoom(next) {
        Ok(()) => *level = next,
        Err(error) => log::error!("Failed to set zoom: {error}"),
    }
}

fn script_menu<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<Submenu<R>> {
    Submenu::with_id_and_items(
        app,
        SCRIPT_SUBMENU_ID,
        "Script",
        true,
        &[
            // Disabled until the frontend reports an open script.
            &MenuItem::with_id(
                app,
                SCRIPT_SETTINGS,
                "Script Settings…",
                false,
                None::<&str>,
            )?,
            &MenuItem::with_id(
                app,
                SCRIPT_ATTRIBUTES,
                "Attribute Manager…",
                false,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, SCRIPT_EXPORT, "Export…", false, None::<&str>)?,
            &MenuItem::with_id(app, SCRIPT_SAVE, "Save Script…", false, None::<&str>)?,
        ],
    )
}

pub fn build_menu<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<Menu<R>> {
    let pkg_info = app.package_info();
    let config = app.config();
    let app_name = config
        .product_name
        .clone()
        .unwrap_or_else(|| pkg_info.name.clone());
    let about_metadata = tauri::menu::AboutMetadata {
        name: Some(app_name.clone()),
        version: Some(pkg_info.version.to_string()),
        copyright: config.bundle.copyright.clone(),
        authors: config
            .bundle
            .publisher
            .clone()
            .map(|publisher| vec![publisher]),
        ..Default::default()
    };

    let window_menu = Submenu::with_id_and_items(
        app,
        tauri::menu::WINDOW_SUBMENU_ID,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::maximize(app, None)?,
            #[cfg(target_os = "macos")]
            &PredefinedMenuItem::separator(app)?,
            #[cfg(target_os = "macos")]
            &PredefinedMenuItem::bring_all_to_front(app, None)?,
            #[cfg(target_os = "macos")]
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, None)?,
        ],
    )?;

    let help_menu = Submenu::with_id_and_items(
        app,
        tauri::menu::HELP_SUBMENU_ID,
        "Help",
        true,
        &[
            &MenuItem::with_id(app, HELP_DOCS, "Stagistic Help", true, None::<&str>)?,
            &MenuItem::with_id(app, HELP_WHATS_NEW, "What’s New", true, None::<&str>)?,
            &MenuItem::with_id(app, HELP_CHANGELOG, "Changelog", true, None::<&str>)?,
            &MenuItem::with_id(
                app,
                HELP_REPORT_PROBLEM,
                "Report a Problem…",
                true,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(
                app,
                HELP_BACKUPS_FOLDER,
                "Show Backups Folder",
                true,
                None::<&str>,
            )?,
            &MenuItem::with_id(
                app,
                HELP_LICENSES,
                "Third-Party Licences",
                true,
                None::<&str>,
            )?,
            #[cfg(not(target_os = "macos"))]
            &PredefinedMenuItem::separator(app)?,
            #[cfg(not(target_os = "macos"))]
            &PredefinedMenuItem::about(app, None, Some(about_metadata.clone()))?,
        ],
    )?;

    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &MenuItem::with_id(
                app,
                FILE_NEW_SCRIPT,
                "New Script",
                true,
                Some("CmdOrCtrl+N"),
            )?,
            &MenuItem::with_id(app, FILE_IMPORT, "Import…", true, None::<&str>)?,
            &MenuItem::with_id(
                app,
                FILE_SCRIPT_LIBRARY,
                "Script Library",
                true,
                Some("CmdOrCtrl+O"),
            )?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, None)?,
            #[cfg(not(target_os = "macos"))]
            &PredefinedMenuItem::quit(app, None)?,
        ],
    )?;

    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            // Custom items: the predefined ones send `undo:` to WebKit's own history,
            // which ProseMirror does not use, and would swallow ⌘Z before the editor.
            &MenuItem::with_id(app, EDIT_UNDO, "Undo", true, Some("CmdOrCtrl+Z"))?,
            &MenuItem::with_id(app, EDIT_REDO, "Redo", true, Some("CmdOrCtrl+Shift+Z"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;

    let view_menu = Submenu::with_items(
        app,
        "View",
        true,
        &[
            &MenuItem::with_id(app, MENU_ID_ZOOM_IN, "Zoom In", true, Some("CmdOrCtrl++"))?,
            &MenuItem::with_id(app, MENU_ID_ZOOM_OUT, "Zoom Out", true, Some("CmdOrCtrl+-"))?,
            &MenuItem::with_id(
                app,
                MENU_ID_ZOOM_RESET,
                "Actual Size",
                true,
                Some("CmdOrCtrl+0"),
            )?,
            #[cfg(target_os = "macos")]
            &PredefinedMenuItem::separator(app)?,
            #[cfg(target_os = "macos")]
            &PredefinedMenuItem::fullscreen(app, None)?,
        ],
    )?;

    let menu = Menu::with_items(
        app,
        &[
            #[cfg(target_os = "macos")]
            &Submenu::with_items(
                app,
                &app_name,
                true,
                &[
                    &PredefinedMenuItem::about(app, None, Some(about_metadata))?,
                    &MenuItem::with_id(
                        app,
                        APP_CHECK_UPDATES,
                        "Check for Updates…",
                        true,
                        None::<&str>,
                    )?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItem::with_id(app, APP_SETTINGS, "Settings…", true, Some("CmdOrCtrl+,"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::services(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::hide(app, None)?,
                    &PredefinedMenuItem::hide_others(app, None)?,
                    &PredefinedMenuItem::show_all(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItem::with_id(
                        app,
                        MENU_ID_QUIT,
                        format!("Quit {app_name}"),
                        true,
                        Some("CmdOrCtrl+Q"),
                    )?,
                ],
            )?,
            &file_menu,
            &edit_menu,
            &script_menu(app)?,
            &view_menu,
            &window_menu,
            &help_menu,
        ],
    )?;

    Ok(menu)
}

/// Handles a menu click: zoom in Rust, frontend ids as `menu-action` events.
/// Returns false for ids it does not own (Quit is handled by the caller).
pub fn handle_menu_event<R: tauri::Runtime>(app: &tauri::AppHandle<R>, id: &str) -> bool {
    match id {
        MENU_ID_ZOOM_IN => apply_zoom(app, ZoomAction::In),
        MENU_ID_ZOOM_OUT => apply_zoom(app, ZoomAction::Out),
        MENU_ID_ZOOM_RESET => apply_zoom(app, ZoomAction::Reset),
        _ if FRONTEND_ACTIONS.contains(&id) => {
            if let Err(error) = app.emit(MENU_EVENT_NAME, id) {
                log::error!("Failed to emit menu event: {error}");
            }
        }
        _ => return false,
    }
    true
}

/// Enables the Script menu items only while a script is open.
pub fn set_script_context<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    in_script: bool,
) -> Result<(), String> {
    let menu = app.menu().ok_or("The app has no menu")?;
    let Some(MenuItemKind::Submenu(script)) = menu.get(SCRIPT_SUBMENU_ID) else {
        return Err("The Script menu is missing".to_string());
    };
    for item in script.items().map_err(|error| error.to_string())? {
        if let MenuItemKind::MenuItem(item) = item {
            item.set_enabled(in_script)
                .map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{next_zoom, ZoomAction, FRONTEND_ACTIONS, ZOOM_MAX, ZOOM_MIN};

    #[test]
    fn zoom_steps_by_ten_percent() {
        assert_eq!(next_zoom(1.0, ZoomAction::In), 1.1);
        assert_eq!(next_zoom(1.1, ZoomAction::In), 1.2);
        assert_eq!(next_zoom(1.0, ZoomAction::Out), 0.9);
    }

    #[test]
    fn zoom_has_no_float_drift_over_many_steps() {
        let mut level = 1.0;
        for _ in 0..7 {
            level = next_zoom(level, ZoomAction::In);
        }
        assert_eq!(level, 1.7);
        for _ in 0..7 {
            level = next_zoom(level, ZoomAction::Out);
        }
        assert_eq!(level, 1.0);
    }

    #[test]
    fn zoom_is_clamped() {
        let mut level = 1.0;
        for _ in 0..50 {
            level = next_zoom(level, ZoomAction::In);
        }
        assert_eq!(level, ZOOM_MAX);
        for _ in 0..50 {
            level = next_zoom(level, ZoomAction::Out);
        }
        assert_eq!(level, ZOOM_MIN);
    }

    #[test]
    fn actual_size_resets() {
        assert_eq!(next_zoom(2.4, ZoomAction::Reset), 1.0);
    }

    #[test]
    fn frontend_ids_are_unique_dotted_ids() {
        for (index, id) in FRONTEND_ACTIONS.iter().enumerate() {
            assert!(id.contains('.'), "{id} is not an area.action id");
            assert!(!FRONTEND_ACTIONS[index + 1..].contains(id), "{id} repeats");
        }
    }
}
