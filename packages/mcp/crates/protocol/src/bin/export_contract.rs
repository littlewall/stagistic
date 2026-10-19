use schemars::schema_for;
use serde_json::json;
use stagistic_mcp_protocol::*;
fn main() {
    println!(
        "{}",
        json!({
            "LocalRequest": schema_for!(LocalRequest), "ReadReply": schema_for!(ReadReply),
            "UiRequest": schema_for!(UiRequest), "UiReply": schema_for!(UiReply), "tools": tool_definitions()
        })
    );
}
