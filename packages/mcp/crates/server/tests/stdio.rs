use serde_json::{json, Value};
use std::process::Stdio;
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    process::Command,
};

#[tokio::test]
async fn offline_handshake_lists_read_tools_and_calls_report_unavailable() {
    let mut child = Command::new(env!("CARGO_BIN_EXE_stagistic-mcp"))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let mut input = child.stdin.take().unwrap();
    let mut output = BufReader::new(child.stdout.take().unwrap()).lines();
    input.write_all(format!("{}\n", json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1"}}})).as_bytes()).await.unwrap();
    let line = tokio::time::timeout(std::time::Duration::from_secs(3), output.next_line())
        .await
        .unwrap()
        .unwrap()
        .expect("missing handshake");
    let hello: Value = serde_json::from_str(&line).unwrap();
    assert_eq!(hello["result"]["serverInfo"]["name"], "stagistic");
    input.write_all(b"{\"jsonrpc\":\"2.0\",\"method\":\"notifications/initialized\"}\n{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/list\"}\n").await.unwrap();
    let listed: Value = serde_json::from_str(&output.next_line().await.unwrap().unwrap()).unwrap();
    assert_eq!(listed["result"]["tools"].as_array().unwrap().len(), 7);
    assert!(listed["result"]["tools"]
        .as_array()
        .unwrap()
        .iter()
        .all(|tool| tool["annotations"]["readOnlyHint"] == true));
    input.write_all(b"{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"list_scripts\",\"arguments\":{}}}\n").await.unwrap();
    let called: Value = serde_json::from_str(&output.next_line().await.unwrap().unwrap()).unwrap();
    assert_eq!(called["result"]["isError"], true);
    assert!(called["result"]["content"][0]["text"]
        .as_str()
        .unwrap()
        .contains("APP_NOT_RUNNING"));
    drop(input);
    tokio::time::timeout(std::time::Duration::from_secs(3), child.wait())
        .await
        .unwrap()
        .unwrap();
}
