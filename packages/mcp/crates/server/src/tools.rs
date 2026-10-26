use rmcp::{model::*, service::RequestContext, ErrorData, RoleServer, ServerHandler};
use serde_json::json;
use stagistic_mcp_protocol::{
    endpoint_path, parse_request, tool_definitions, ErrorCode, ReadReply, PROTOCOL_VERSION,
};

pub struct StagisticServer;
impl ServerHandler for StagisticServer {
    fn get_info(&self) -> ServerConfig {
        let mut info = ServerConfig::new(ServerCapabilities::builder().enable_tools().build());
        info.server_info = Implementation::new("stagistic", env!("CARGO_PKG_VERSION"));
        info
    }
    async fn list_tools(
        &self,
        _: Option<PaginatedRequestParams>,
        _: RequestContext<RoleServer>,
    ) -> Result<ListToolsResult, ErrorData> {
        Ok(ListToolsResult {
            tools: tool_definitions()
                .into_iter()
                .map(serde_json::from_value)
                .collect::<Result<_, _>>()
                .map_err(|_| ErrorData::internal_error("Invalid tool definitions", None))?,
            ..Default::default()
        })
    }
    async fn call_tool(
        &self,
        request: CallToolRequestParams,
        _: RequestContext<RoleServer>,
    ) -> Result<CallToolResponse, ErrorData> {
        let raw = json!({"protocol_version": PROTOCOL_VERSION, "operation": {"tool": request.name, "arguments": request.arguments.unwrap_or_default()}});
        let reply = match parse_request(raw.to_string().as_bytes()) {
            Ok(request) => crate::transport::call_local(&endpoint_path(), &request).await,
            Err(code) => ReadReply::error(
                if code == "VERSION_MISMATCH" {
                    ErrorCode::VersionMismatch
                } else {
                    ErrorCode::InvalidArgument
                },
                "Invalid Stagistic tool arguments.",
            ),
        };
        let (value, failed) = match reply {
            ReadReply::Success { page, .. } => {
                (serde_json::to_value(page).unwrap_or_default(), false)
            }
            ReadReply::Failure { error, .. } => {
                (serde_json::to_value(error).unwrap_or_default(), true)
            }
        };
        let content = vec![ContentBlock::text(value.to_string())];
        let mut result = if failed {
            CallToolResult::error(content)
        } else {
            CallToolResult::success(content)
        };
        if serde_json::to_vec(&result).map_or(true, |bytes| bytes.len() > 60 * 1024) {
            result = CallToolResult::error(vec![ContentBlock::text("{\"code\":\"CONTENT_TOO_LARGE\",\"message\":\"The result exceeds the MCP message limit.\"}")]);
        }
        Ok(result.into())
    }
}
