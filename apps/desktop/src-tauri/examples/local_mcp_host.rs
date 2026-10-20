// Test-only adapter: production broker and socket, stdin/stdout instead of WebView IPC.
use stagistic_editor::mcp::broker::McpBroker;
use stagistic_mcp_protocol::{endpoint_path, UiReply};
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};

#[tokio::main]
async fn main() {
    let broker = McpBroker::new(
        endpoint_path(),
        Arc::new(|request| {
            println!("{}", serde_json::to_string(&request).unwrap());
            Ok(())
        }),
    );
    broker.enable().await.expect(
        "Development MCP endpoint unavailable; stop the development app before running this test.",
    );
    broker.attach();
    println!("{{\"ready\":true}}");
    let mut input = BufReader::new(tokio::io::stdin()).lines();
    while let Ok(Some(line)) = input.next_line().await {
        if let Ok(reply) = serde_json::from_str::<UiReply>(&line) {
            let _ = broker.submit_reply(reply);
        }
    }
    broker.disable().await;
}
