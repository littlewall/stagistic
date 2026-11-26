mod commands;
mod menu;
use stagistic_editor::mcp::{broker::McpBroker, commands::McpState};
use std::sync::Arc;

use tauri::{Emitter, Manager};

/// Logs go to stdout and `~/Library/Logs/<identifier>/`. Info in release, debug
/// in dev. Messages carry events and errors, never script text.
fn log_plugin<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri_plugin_log::Builder::new()
        .level(if cfg!(debug_assertions) {
            log::LevelFilter::Debug
        } else {
            log::LevelFilter::Info
        })
        .clear_targets()
        .target(tauri_plugin_log::Target::new(
            tauri_plugin_log::TargetKind::Stdout,
        ))
        // `stagistic-editor.log` in `~/Library/Logs/<identifier>/`.
        .target(tauri_plugin_log::Target::new(
            tauri_plugin_log::TargetKind::LogDir {
                file_name: Some("stagistic-editor".into()),
            },
        ))
        .max_file_size(2_000_000)
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(3))
        .build()
}

fn main() {
    tauri::Builder::default()
        // Registered first so every later plugin and setup step can log.
        .plugin(log_plugin())
        // Tauri 3 requires the runtime to be selected explicitly; without this
        // the app fails to start with `RuntimeNotConfigured`.
        .runtime(tauri_runtime_wry::Wry::default())
        .setup(|app| {
            log::info!("Stagistic Editor {} started", app.package_info().version);
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
            app.manage(commands::ShutdownState::default());
            app.manage(menu::ZoomState::default());
            if state.data_dir.join("mcp/enabled").exists() {
                tauri::async_runtime::spawn(async move {
                    if state.set_enabled(true).await.is_err() {
                        log::error!("Local MCP could not start.");
                    }
                });
            }
            Ok(())
        })
        .on_page_load(|webview, payload| {
            if webview.label() == "main"
                && matches!(payload.event(), tauri::webview::PageLoadEvent::Started)
            {
                if let Some(shutdown) = webview.try_state::<commands::ShutdownState>() {
                    shutdown.reset();
                }
                if let Some(state) = webview.try_state::<Arc<McpState>>() {
                    state.broker.invalidate();
                }
            }
        })
        .on_window_event(|window, event| {
            // Close (button, ⌘W) runs the safe-shutdown sequence in the frontend first.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let app = window.app_handle();
                if window.label() == "main"
                    && app
                        .try_state::<commands::ShutdownState>()
                        .is_some_and(|state| state.should_intercept())
                {
                    api.prevent_close();
                    if let Err(error) = app.emit(commands::SHUTDOWN_EVENT, ()) {
                        log::error!("Failed to emit shutdown request: {error}");
                    }
                }
            }
        })
        .menu(menu::build_menu)
        .on_menu_event(|app, event| {
            if event.id() == menu::MENU_ID_QUIT {
                let intercept = app
                    .try_state::<commands::ShutdownState>()
                    .is_some_and(|state| state.should_intercept());
                if intercept {
                    if let Err(error) = app.emit(commands::SHUTDOWN_EVENT, ()) {
                        log::error!("Failed to emit shutdown request: {error}");
                    }
                } else {
                    app.exit(0);
                }
            } else {
                menu::handle_menu_event(app, event.id().as_ref());
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::ping,
            commands::desktop_shutdown_ready,
            commands::desktop_exit,
            commands::desktop_relaunch,
            commands::desktop_show_backups_folder,
            commands::desktop_show_attachments_folder,
            commands::desktop_import_backup_file,
            commands::desktop_open_download_page,
            commands::desktop_open_external_url,
            commands::desktop_open_licenses,
            commands::desktop_set_menu_context,
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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| match event {
            tauri::RunEvent::Opened { urls } => {
                for url in urls {
                    if url.scheme() == "stagistic" {
                        if let Err(error) = app.emit("deep-link-open", url.as_str()) {
                            log::error!("Failed to emit deep-link event: {error}");
                        }
                    }
                }
            }
            // ⌘Q / menu Quit: only user-initiated exits (code None) are intercepted.
            tauri::RunEvent::ExitRequested { api, code, .. }
                if code.is_none()
                    && app
                        .try_state::<commands::ShutdownState>()
                        .is_some_and(|state| state.should_intercept()) =>
            {
                api.prevent_exit();
                if let Err(error) = app.emit(commands::SHUTDOWN_EVENT, ()) {
                    log::error!("Failed to emit shutdown request: {error}");
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
