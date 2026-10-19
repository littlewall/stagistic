use stagistic_mcp::transport::call_local;
use stagistic_mcp_protocol::{parse_request, ErrorCode, ReadReply};
use std::os::unix::fs::PermissionsExt;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::UnixListener,
};

#[tokio::test]
async fn refuses_endpoint_with_public_directory_before_accepting_a_reply() {
    let directory = tempfile::tempdir().unwrap();
    std::fs::set_permissions(directory.path(), std::fs::Permissions::from_mode(0o755)).unwrap();
    let path = directory.path().join("run.sock");
    let listener = UnixListener::bind(&path).unwrap();
    std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600)).unwrap();
    let fake = tokio::spawn(async move {
        let (mut stream, _) = listener.accept().await.unwrap();
        let mut data = [0u8; 4096];
        let _ = stream.read(&mut data).await;
        let reply = ReadReply::error(ErrorCode::NotFound, "untrusted responder");
        let line = serde_json::to_string(&reply).unwrap() + "\n";
        let _ = stream.write_all(line.as_bytes()).await;
    });
    let request = parse_request(
        br#"{"protocol_version":1,"operation":{"tool":"list_scripts","arguments":{}}}"#,
    )
    .unwrap();
    let reply = call_local(&path, &request).await;
    fake.abort();
    assert!(matches!(
        reply,
        ReadReply::Failure {
            error: stagistic_mcp_protocol::McpReadError {
                code: ErrorCode::InternalError,
                ..
            },
            ..
        }
    ));
}
