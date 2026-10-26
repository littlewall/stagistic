use stagistic_mcp_protocol::{ErrorCode, LocalRequest, ReadReply, REPLY_BYTES};
use std::{
    os::unix::fs::{FileTypeExt, MetadataExt},
    path::Path,
    time::Duration,
};
use tokio::{
    io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader},
    net::UnixStream,
};

pub async fn call_local(path: &Path, request: &LocalRequest) -> ReadReply {
    match tokio::time::timeout(Duration::from_secs(12), exchange(path, request)).await {
        Ok(Ok(reply)) => reply,
        Ok(Err(error))
            if matches!(
                error.kind(),
                std::io::ErrorKind::NotFound | std::io::ErrorKind::ConnectionRefused
            ) =>
        {
            ReadReply::error(
                ErrorCode::AppNotRunning,
                "Open Stagistic and enable local MCP access.",
            )
        }
        Ok(Err(_)) => ReadReply::error(
            ErrorCode::InternalError,
            "The local application returned an invalid response.",
        ),
        Err(_) => ReadReply::error(
            ErrorCode::Timeout,
            "The local application did not respond in time.",
        ),
    }
}

async fn exchange(path: &Path, request: &LocalRequest) -> std::io::Result<ReadReply> {
    let parent = path
        .parent()
        .ok_or_else(|| std::io::Error::other("Invalid endpoint"))?;
    let directory = tokio::fs::symlink_metadata(parent).await?;
    let socket = tokio::fs::symlink_metadata(path).await?;
    let uid = stagistic_mcp_protocol::current_uid();
    if !directory.is_dir()
        || directory.uid() != uid
        || directory.mode() & 0o777 != 0o700
        || !socket.file_type().is_socket()
        || socket.uid() != uid
        || socket.mode() & 0o777 != 0o600
    {
        return Err(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            "Unsafe local endpoint",
        ));
    }
    let mut stream = UnixStream::connect(path).await?;
    let mut data = serde_json::to_vec(request)?;
    data.push(b'\n');
    stream.write_all(&data).await?;
    let mut frame = Vec::new();
    BufReader::new(stream.take((REPLY_BYTES + 2) as u64))
        .read_until(b'\n', &mut frame)
        .await?;
    if frame.len() > REPLY_BYTES + 1 || frame.last() != Some(&b'\n') {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Invalid frame",
        ));
    }
    let reply: ReadReply = serde_json::from_slice(&frame)?;
    let valid = match &reply {
        ReadReply::Success { ok, .. } => *ok,
        ReadReply::Failure { ok, .. } => !ok,
    };
    if !valid {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Invalid reply",
        ));
    }
    Ok(reply)
}
