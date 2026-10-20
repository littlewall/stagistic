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
        ]),
    ))
    .expect("Failed to build Tauri manifest")
}
