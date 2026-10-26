use stagistic_editor::mcp::broker::McpBroker;
use stagistic_mcp_protocol::{parse_request, ErrorCode, ReadReply, UiReply};
use std::sync::Arc;

fn private_dir() -> tempfile::TempDir {
    use std::os::unix::fs::PermissionsExt;
    let directory = tempfile::Builder::new()
        .prefix("stg-mcp-")
        .tempdir_in("/tmp")
        .unwrap();
    std::fs::set_permissions(directory.path(), std::fs::Permissions::from_mode(0o700)).unwrap();
    directory
}

#[tokio::test(start_paused = true)]
async fn bounds_concurrency_times_out_and_reuses_released_slots() {
    let dir = private_dir();
    let (send, mut receive) = tokio::sync::mpsc::unbounded_channel();
    let broker = McpBroker::new(
        dir.path().join("run.sock"),
        Arc::new(move |request| send.send(request).map_err(|_| ())),
    );
    broker.enable().await.unwrap();
    broker.attach();
    let request = parse_request(
        br#"{"protocol_version":1,"operation":{"tool":"list_scripts","arguments":{}}}"#,
    )
    .unwrap();
    let mut calls = Vec::new();
    for _ in 0..8 {
        let cloned = broker.clone();
        let request = request.clone();
        calls.push(tokio::spawn(async move { cloned.dispatch(request).await }));
    }
    for _ in 0..8 {
        receive.recv().await.unwrap();
    }
    let busy = broker.dispatch(request.clone()).await;
    assert!(matches!(
        busy,
        ReadReply::Failure {
            error: stagistic_mcp_protocol::McpReadError {
                code: ErrorCode::Busy,
                ..
            },
            ..
        }
    ));
    tokio::time::advance(std::time::Duration::from_secs(10)).await;
    for call in calls {
        assert!(matches!(
            call.await.unwrap(),
            ReadReply::Failure {
                error: stagistic_mcp_protocol::McpReadError {
                    code: ErrorCode::Timeout,
                    ..
                },
                ..
            }
        ));
    }
    let cloned = broker.clone();
    let next = tokio::spawn(async move { cloned.dispatch(request).await });
    let ui = receive.recv().await.unwrap();
    broker
        .submit_reply(UiReply {
            generation: ui.generation,
            request_id: ui.request_id,
            reply: ReadReply::Success {
                ok: true,
                page: stagistic_mcp_protocol::ReadPage {
                    format: "metadata".into(),
                    scope: serde_json::json!({"kind":"library"}),
                    revision: "r".into(),
                    items: vec![],
                    next_cursor: None,
                    incomplete: false,
                },
            },
        })
        .unwrap();
    assert!(matches!(next.await.unwrap(), ReadReply::Success { .. }));
    broker.disable().await;
}

#[tokio::test]
async fn endpoint_rejects_symlinks_second_instances_and_cleans_stale_socket() {
    use stagistic_editor::mcp::endpoint::open_endpoint;
    use std::os::unix::fs::{symlink, PermissionsExt};
    let dir = private_dir();
    let path = dir.path().join("run.sock");
    let endpoint = open_endpoint(&path).await.unwrap();
    assert_eq!(
        std::fs::metadata(&path).unwrap().permissions().mode() & 0o777,
        0o600
    );
    assert!(open_endpoint(&path).await.is_err());
    drop(endpoint);
    assert!(!path.exists());
    let stale = std::os::unix::net::UnixListener::bind(&path).unwrap();
    drop(stale);
    let endpoint = open_endpoint(&path).await.unwrap();
    drop(endpoint);
    let destination = dir.path().join("private-file");
    std::fs::write(&destination, "keep").unwrap();
    symlink(&destination, &path).unwrap();
    assert!(open_endpoint(&path).await.is_err());
    assert_eq!(std::fs::read_to_string(destination).unwrap(), "keep");
}

#[tokio::test]
async fn rejects_late_generation_replies_and_routes_live_responses() {
    let dir = tempfile::tempdir().unwrap();
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(dir.path(), std::fs::Permissions::from_mode(0o700)).unwrap();
    let (send, mut receive) = tokio::sync::mpsc::unbounded_channel();
    let broker = McpBroker::new(
        dir.path().join("run.sock"),
        Arc::new(move |request| send.send(request).map_err(|_| ())),
    );
    broker.enable().await.unwrap();
    let old = broker.attach();
    let cloned = broker.clone();
    let call = tokio::spawn(async move {
        cloned
            .dispatch(
                parse_request(
                    br#"{"protocol_version":1,"operation":{"tool":"list_scripts","arguments":{}}}"#,
                )
                .unwrap(),
            )
            .await
    });
    let request = tokio::time::timeout(std::time::Duration::from_millis(200), receive.recv())
        .await
        .unwrap()
        .unwrap();
    let new = broker.attach();
    assert_ne!(old, new);
    assert!(broker
        .submit_reply(UiReply {
            generation: old.clone(),
            request_id: request.request_id,
            reply: ReadReply::error(ErrorCode::NotFound, "late")
        })
        .is_err());
    broker.detach(&old);
    let result = call.await.unwrap();
    assert!(matches!(result, ReadReply::Failure { .. }));
    broker.disable().await;
    assert!(!dir.path().join("run.sock").exists());
}
