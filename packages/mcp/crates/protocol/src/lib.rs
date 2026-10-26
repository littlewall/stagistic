mod operations;
mod results;
pub use operations::*;
pub use results::*;
pub const PROTOCOL_VERSION: u32 = 1;
pub const BRIDGE_VERSION: &str = env!("CARGO_PKG_VERSION");
pub const REQUEST_BYTES: usize = 16 * 1024;
pub const REPLY_BYTES: usize = 32 * 1024;
pub const MCP_BYTES: usize = 64 * 1024;
pub const MAX_ACTIVE: usize = 8;

pub fn parse_request(bytes: &[u8]) -> Result<LocalRequest, String> {
    if bytes.len() > REQUEST_BYTES {
        return Err("INVALID_ARGUMENT".into());
    }
    let request: LocalRequest = serde_json::from_slice(bytes).map_err(|_| "INVALID_ARGUMENT")?;
    if request.protocol_version != PROTOCOL_VERSION {
        return Err("VERSION_MISMATCH".into());
    }
    request.operation.validate()?;
    Ok(request)
}

pub fn endpoint_path() -> std::path::PathBuf {
    let channel = if cfg!(debug_assertions) { "-dev" } else { "" };
    let uid = current_uid();
    std::path::PathBuf::from(format!("/tmp/stagistic-mcp{channel}-{uid}/run.sock"))
}

pub fn current_uid() -> u32 {
    unsafe { libc_uid::getuid() }
}

#[cfg(unix)]
mod libc_uid {
    unsafe extern "C" {
        pub fn getuid() -> u32;
    }
}
