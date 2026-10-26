mod commands;
use stagistic_editor::mcp::{broker::McpBroker, commands::McpState};
use std::sync::Arc;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter, Manager,
};

const MENU_EVENT_NAME: &str = "menu-action";
const MENU_ID_OPEN_SCRIPT: &str = "file_open_script";
const MENU_ID_NEW_SCRIPT: &str = "file_new_script";
const MENU_ID_IMPORT: &str = "file_import_script";

fn build_menu<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<Menu<R>> {
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
            &PredefinedMenuItem::close_window(app, None)?,
        ],
    )?;

    let help_menu = Submenu::with_id_and_items(
        app,
        tauri::menu::HELP_SUBMENU_ID,
        "Help",
        true,
        &[
            #[cfg(not(target_os = "macos"))]
            &PredefinedMenuItem::about(app, None, Some(about_metadata))?,
        ],
    )?;

    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &MenuItem::with_id(
                app,
                MENU_ID_OPEN_SCRIPT,
                "Open Script…",
                true,
                Some("CmdOrCtrl+O"),
            )?,
            &MenuItem::with_id(
                app,
                MENU_ID_NEW_SCRIPT,
                "New Script",
                true,
                Some("CmdOrCtrl+N"),
            )?,
            &MenuItem::with_id(app, MENU_ID_IMPORT, "Import…", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, None)?,
            #[cfg(not(target_os = "macos"))]
            &PredefinedMenuItem::quit(app, None)?,
        ],
    )?;

    let menu = Menu::with_items(
        app,
        &[
            #[cfg(target_os = "macos")]
            &Submenu::with_items(
                app,
                app_name,
                true,
                &[
                    &PredefinedMenuItem::about(app, None, Some(about_metadata))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::services(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::hide(app, None)?,
                    &PredefinedMenuItem::hide_others(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::quit(app, None)?,
                ],
            )?,
            &file_menu,
            &Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(app, None)?,
                    &PredefinedMenuItem::redo(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, None)?,
                    &PredefinedMenuItem::copy(app, None)?,
                    &PredefinedMenuItem::paste(app, None)?,
                    &PredefinedMenuItem::select_all(app, None)?,
                ],
            )?,
            #[cfg(target_os = "macos")]
            &Submenu::with_items(
                app,
                "View",
                true,
                &[&PredefinedMenuItem::fullscreen(app, None)?],
            )?,
            &window_menu,
            &help_menu,
        ],
    )?;

    Ok(menu)
}

fn main() {
    tauri::Builder::default()
        // Tauri 3 requires the runtime to be selected explicitly; without this
        // the app fails to start with `RuntimeNotConfigured`.
        .runtime(tauri_runtime_wry::Wry::default())
        .setup(|app| {
            let handle = app.handle().clone();
            let broker = McpBroker::new(
                stagistic_mcp_protocol::endpoint_path(),
                Arc::new(move |request| {
                    handle
                        .emit_to(
                            tauri::EventTarget::webview("main"),
                            "stagistic:mcp-request",
                            request,
                        )
                        .map_err(|_| ())
                }),
            );
            let mut data_dir = app.path().app_data_dir()?;
            if cfg!(debug_assertions) {
                data_dir.push("development");
            }
            let state = Arc::new(McpState::new(broker, data_dir, app.path().resource_dir()?));
            app.manage(state.clone());
            if state.data_dir.join("mcp/enabled").exists() {
                tauri::async_runtime::spawn(async move {
                    if state.set_enabled(true).await.is_err() {
                        eprintln!("Local MCP could not start.");
                    }
                });
            }
            Ok(())
        })
        .on_page_load(|webview, payload| {
            if webview.label() == "main"
                && matches!(payload.event(), tauri::webview::PageLoadEvent::Started)
            {
                if let Some(state) = webview.try_state::<Arc<McpState>>() {
                    state.broker.invalidate();
                }
            }
        })
        .menu(build_menu)
        .on_menu_event(|app, event| {
            if event.id() == MENU_ID_OPEN_SCRIPT {
                if let Err(error) = app.emit(MENU_EVENT_NAME, "open-script") {
                    eprintln!("Failed to emit menu event: {error}");
                }
            } else if event.id() == MENU_ID_NEW_SCRIPT {
                if let Err(error) = app.emit(MENU_EVENT_NAME, "new-script") {
                    eprintln!("Failed to emit menu event: {error}");
                }
            } else if event.id() == MENU_ID_IMPORT {
                if let Err(error) = app.emit(MENU_EVENT_NAME, "import-script") {
                    eprintln!("Failed to emit menu event: {error}");
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::ping,
            stagistic_editor::mcp::commands::mcp_status,
            stagistic_editor::mcp::commands::mcp_enable,
            stagistic_editor::mcp::commands::mcp_disable,
            stagistic_editor::mcp::commands::mcp_attach,
            stagistic_editor::mcp::commands::mcp_detach,
            stagistic_editor::mcp::commands::mcp_reply,
            stagistic_editor::mcp::commands::mcp_prepare_manual,
            stagistic_editor::mcp::commands::mcp_install_claude,
        ])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| match event {
            tauri::RunEvent::Opened { urls } => {
                for url in urls {
                    if url.scheme() == "stagistic" {
                        if let Err(error) = app.emit("deep-link-open", url.as_str()) {
                            eprintln!("Failed to emit deep-link event: {error}");
                        }
                    }
                }
            }
            tauri::RunEvent::Exit => {
                if let Some(state) = app.try_state::<Arc<McpState>>() {
                    tauri::async_runtime::block_on(state.broker.disable());
                }
            }
            _ => {}
        });
}
