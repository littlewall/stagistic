use serde_json::{json, Value};
use std::process::Stdio;
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    process::Command,
};

#[tokio::test]
async fn prompts_list_and_get() {
    let mut child = Command::new(env!("CARGO_BIN_EXE_stagistic-mcp"))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let mut input = child.stdin.take().unwrap();
    let mut output = BufReader::new(child.stdout.take().unwrap()).lines();
    input
        .write_all(
            format!(
                "{}\n",
                json!({
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "initialize",
                    "params": {
                        "protocolVersion": "2025-06-18",
                        "capabilities": {},
                        "clientInfo": {"name": "test", "version": "1"}
                    }
                })
            )
            .as_bytes(),
        )
        .await
        .unwrap();
    let _hello = output.next_line().await.unwrap().unwrap();
    input
        .write_all(b"{\"jsonrpc\":\"2.0\",\"method\":\"notifications/initialized\"}\n{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"prompts/list\"}\n")
        .await
        .unwrap();
    let listed: Value = serde_json::from_str(&output.next_line().await.unwrap().unwrap()).unwrap();
    let prompts = listed["result"]["prompts"]
        .as_array()
        .expect("expected prompts array");
    assert_eq!(prompts.len(), 6);

    let prompt_names: Vec<&str> = prompts
        .iter()
        .map(|p| p["name"].as_str().unwrap())
        .collect();
    assert!(prompt_names.contains(&"check-scene-engine"));
    assert!(prompt_names.contains(&"check-character-voice"));
    assert!(prompt_names.contains(&"check-song-transition"));
    assert!(prompt_names.contains(&"audit-epistemic-timeline"));
    assert!(prompt_names.contains(&"audit-stage-logistics"));
    assert!(prompt_names.contains(&"audit-musical-architecture"));

    input
        .write_all(
            b"{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"prompts/get\",\"params\":{\"name\":\"check-scene-engine\",\"arguments\":{\"script_id\":\"s1\",\"scene_id\":\"sc-1\"}}}\n",
        )
        .await
        .unwrap();
    let got: Value = serde_json::from_str(&output.next_line().await.unwrap().unwrap()).unwrap();
    let text = got["result"]["messages"][0]["content"]["text"]
        .as_str()
        .unwrap();
    assert!(text.contains("stagistic://"));

    drop(input);
    child.wait().await.unwrap();
}
