use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct ReadPage {
    pub format: String,
    pub scope: Value,
    pub revision: String,
    pub items: Vec<Value>,
    pub next_cursor: Option<String>,
    pub incomplete: bool,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    AppNotRunning,
    AppNotReady,
    IntegrationDisabled,
    VersionMismatch,
    InvalidArgument,
    NotFound,
    Busy,
    Timeout,
    StaleCursor,
    ContentTooLarge,
    InternalError,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct McpReadError {
    pub code: ErrorCode,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub block_id: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(untagged)]
pub enum ReadReply {
    Success { ok: bool, page: ReadPage },
    Failure { ok: bool, error: McpReadError },
}
impl ReadReply {
    pub fn error(code: ErrorCode, message: &str) -> Self {
        Self::Failure {
            ok: false,
            error: McpReadError {
                code,
                message: message.into(),
                block_id: None,
            },
        }
    }
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct UiRequest {
    pub generation: String,
    pub request_id: String,
    pub request: super::LocalRequest,
}
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct UiReply {
    pub generation: String,
    pub request_id: String,
    pub reply: ReadReply,
}
