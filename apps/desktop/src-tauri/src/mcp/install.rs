use serde::Serialize;
use std::{
    fs::{self, OpenOptions},
    io::{self, Write},
    os::unix::fs::{OpenOptionsExt, PermissionsExt},
    path::{Path, PathBuf},
    process::Command,
};

#[derive(Serialize)]
pub struct ManualConfig {
    pub command: String,
    pub args: Vec<String>,
    pub version: String,
}
#[derive(Serialize)]
pub struct InstallRequested {
    pub status: &'static str,
}

pub fn atomic_copy(source: &Path, target: &Path, mode: u32) -> io::Result<()> {
    let parent = target
        .parent()
        .ok_or_else(|| io::Error::other("Missing parent"))?;
    fs::create_dir_all(parent)?;
    let temporary = parent.join(format!(".mcp-{}", uuid::Uuid::new_v4()));
    let result = (|| {
        let mut output = OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(mode)
            .open(&temporary)?;
        let mut input = fs::File::open(source)?;
        io::copy(&mut input, &mut output)?;
        output.flush()?;
        output.sync_all()?;
        fs::set_permissions(&temporary, fs::Permissions::from_mode(mode))?;
        fs::rename(&temporary, target)
    })();
    if result.is_err() {
        let _ = fs::remove_file(temporary);
    }
    result
}

pub fn prepare_manual(resource_dir: &Path, data_dir: &Path) -> Result<ManualConfig, String> {
    let source = resource_dir.join("mcp/stagistic-mcp");
    let target = data_dir.join("mcp/server/stagistic-mcp");
    let candidate = data_dir.join(format!("mcp/.candidate-{}", uuid::Uuid::new_v4()));
    let result = (|| {
        atomic_copy(&source, &candidate, 0o700)
            .map_err(|_| "Could not prepare the MCP executable.")?;
        let mut child = Command::new(&candidate)
            .arg("--version")
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|_| "The MCP executable could not be started.")?;
        let start = std::time::Instant::now();
        while child
            .try_wait()
            .map_err(|_| "MCP executable check failed.")?
            .is_none()
        {
            if start.elapsed() > std::time::Duration::from_secs(2) {
                let _ = child.kill();
                let _ = child.wait();
                return Err("MCP executable check timed out.".into());
            }
            std::thread::sleep(std::time::Duration::from_millis(10));
        }
        let output = child
            .wait_with_output()
            .map_err(|_| "MCP executable check failed.")?;
        let version =
            String::from_utf8(output.stdout).map_err(|_| "Invalid MCP executable version.")?;
        let expected = format!(
            "stagistic-mcp {} protocol={}",
            stagistic_mcp_protocol::BRIDGE_VERSION,
            stagistic_mcp_protocol::PROTOCOL_VERSION
        );
        if !output.status.success() || version.trim() != expected {
            return Err("Invalid MCP executable.".into());
        }
        fs::create_dir_all(target.parent().unwrap())
            .map_err(|_| "Could not prepare the MCP directory.")?;
        fs::rename(&candidate, &target).map_err(|_| "Could not replace the MCP executable.")?;
        Ok(ManualConfig {
            command: target
                .to_str()
                .ok_or("Unsupported executable path.")?
                .into(),
            args: vec![],
            version: version.trim().into(),
        })
    })();
    let _ = fs::remove_file(candidate);
    result
}

pub fn prepare_claude_bundle(resource_dir: &Path, data_dir: &Path) -> Result<PathBuf, String> {
    let target = data_dir.join("mcp/stagistic.mcpb");
    atomic_copy(&resource_dir.join("mcp/stagistic.mcpb"), &target, 0o600)
        .map_err(|_| "Could not prepare the Claude bundle.")?;
    Ok(target)
}

pub fn open_in_claude(bundle: &Path) -> Result<InstallRequested, String> {
    let status = Command::new("/usr/bin/open")
        .args(["-b", "com.anthropic.claudefordesktop"])
        .arg(bundle)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map_err(|_| "Could not open Claude Desktop.")?;
    if !status.success() {
        return Err("Claude Desktop is unavailable or could not open the bundle.".into());
    }
    Ok(InstallRequested {
        status: "installation_requested",
    })
}
