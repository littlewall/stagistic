use super::{
    broker::McpBroker,
    install::{self, InstallRequested, ManualConfig},
};
use serde::Serialize;
use stagistic_mcp_protocol::{UiReply, PROTOCOL_VERSION};
use std::{fs, path::PathBuf, sync::Arc};
use tauri::{Manager, State, Webview};

pub struct McpState {
    pub broker: Arc<McpBroker>,
    pub data_dir: PathBuf,
    pub resource_dir: PathBuf,
    admin: tokio::sync::Mutex<()>,
}
impl McpState {
    pub fn new(broker: Arc<McpBroker>, data_dir: PathBuf, resource_dir: PathBuf) -> Self {
        Self {
            broker,
            data_dir,
            resource_dir,
            admin: tokio::sync::Mutex::new(()),
        }
    }
    pub async fn set_enabled(&self, enabled: bool) -> Result<(), String> {
        let _guard = self.admin.lock().await;
        let flag = self.data_dir.join("mcp/enabled");
        if !enabled {
            self.broker.disable().await;
            if flag.exists() {
                fs::remove_file(flag).map_err(|_| "Could not save MCP preference.")?;
            }
            return Ok(());
        }
        self.broker.enable().await?;
        let stored =
            fs::create_dir_all(flag.parent().unwrap()).and_then(|_| fs::write(&flag, b"enabled"));
        if stored.is_err() {
            self.broker.disable().await;
            return Err("Could not save MCP preference.".into());
        }
        Ok(())
    }
}

#[derive(Serialize)]
pub struct McpStatus {
    pub enabled: bool,
    pub ready: bool,
    pub protocol_version: u32,
    pub bridge_version: &'static str,
}

fn check_main(webview: &Webview) -> Result<(), String> {
    let url = webview.url().map_err(|_| "Untrusted MCP caller")?;
    let local = url.scheme() == "tauri" && url.host_str() == Some("localhost");
    let dev = cfg!(debug_assertions)
        && webview
            .app_handle()
            .config()
            .build
            .dev_url
            .as_ref()
            .is_some_and(|configured| configured.origin() == url.origin());
    if webview.label() != "main" || (!local && !dev) {
        return Err("Untrusted MCP caller".into());
    }
    Ok(())
}

#[tauri::command]
pub fn mcp_status(webview: Webview, state: State<'_, Arc<McpState>>) -> Result<McpStatus, String> {
    check_main(&webview)?;
    Ok(McpStatus {
        enabled: state.broker.enabled(),
        ready: state.broker.ready(),
        protocol_version: PROTOCOL_VERSION,
        bridge_version: stagistic_mcp_protocol::BRIDGE_VERSION,
    })
}
#[tauri::command]
pub async fn mcp_enable(webview: Webview, state: State<'_, Arc<McpState>>) -> Result<(), String> {
    check_main(&webview)?;
    state.set_enabled(true).await
}
#[tauri::command]
pub async fn mcp_disable(webview: Webview, state: State<'_, Arc<McpState>>) -> Result<(), String> {
    check_main(&webview)?;
    state.set_enabled(false).await
}
#[tauri::command]
pub fn mcp_attach(webview: Webview, state: State<'_, Arc<McpState>>) -> Result<String, String> {
    check_main(&webview)?;
    Ok(state.broker.attach())
}
#[tauri::command]
pub fn mcp_detach(
    webview: Webview,
    state: State<'_, Arc<McpState>>,
    generation: String,
) -> Result<(), String> {
    check_main(&webview)?;
    state.broker.detach(&generation);
    Ok(())
}
#[tauri::command]
pub fn mcp_reply(
    webview: Webview,
    state: State<'_, Arc<McpState>>,
    reply: UiReply,
) -> Result<(), String> {
    check_main(&webview)?;
    state.broker.submit_reply(reply)
}
#[tauri::command]
pub async fn mcp_prepare_manual(
    webview: Webview,
    state: State<'_, Arc<McpState>>,
) -> Result<ManualConfig, String> {
    check_main(&webview)?;
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        install::prepare_manual(&state.resource_dir, &state.data_dir)
    })
    .await
    .map_err(|_| "MCP preparation failed.")?
}
#[tauri::command]
pub async fn mcp_install_claude(
    webview: Webview,
    state: State<'_, Arc<McpState>>,
) -> Result<InstallRequested, String> {
    check_main(&webview)?;
    if cfg!(debug_assertions) {
        return Err("Install the Claude bundle from a release build of Stagistic.".into());
    }
    let bundle = install::prepare_claude_bundle(&state.resource_dir, &state.data_dir)?;
    state.set_enabled(true).await?;
    tauri::async_runtime::spawn_blocking(move || install::open_in_claude(&bundle))
        .await
        .map_err(|_| "Could not open Claude.")?
}
