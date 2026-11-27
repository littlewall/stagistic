fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "mcp_status",
            "mcp_enable",
            "mcp_disable",
            "mcp_attach",
            "mcp_detach",
            "mcp_reply",
            "mcp_prepare_manual",
            "mcp_install_claude",
            "desktop_shutdown_ready",
            "desktop_exit",
            "desktop_relaunch",
            "desktop_show_backups_folder",
            "desktop_show_attachments_folder",
            "desktop_import_backup_file",
            "desktop_open_download_page",
            "desktop_open_external_url",
            "desktop_open_licenses",
            "desktop_set_menu_context",
        ]),
    ))
    .expect("Failed to build Tauri manifest")
}
