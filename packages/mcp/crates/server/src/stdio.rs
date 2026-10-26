use futures::{SinkExt, StreamExt};
use rmcp::{
    service::{RxJsonRpcMessage, TxJsonRpcMessage},
    transport::{async_rw::JsonRpcMessageCodec, Transport},
    RoleServer,
};
use stagistic_mcp_protocol::MCP_BYTES;
use std::{io, sync::Arc};
use tokio::{
    io::{Stdin, Stdout},
    sync::Mutex,
};
use tokio_util::codec::{FramedRead, FramedWrite};

pub struct BoundedStdio {
    input: FramedRead<Stdin, JsonRpcMessageCodec<RxJsonRpcMessage<RoleServer>>>,
    output: Arc<Mutex<FramedWrite<Stdout, JsonRpcMessageCodec<TxJsonRpcMessage<RoleServer>>>>>,
}
impl BoundedStdio {
    pub fn new() -> Self {
        Self {
            input: FramedRead::new(
                tokio::io::stdin(),
                JsonRpcMessageCodec::new_with_max_length(MCP_BYTES),
            ),
            output: Arc::new(Mutex::new(FramedWrite::new(
                tokio::io::stdout(),
                JsonRpcMessageCodec::new_with_max_length(MCP_BYTES),
            ))),
        }
    }
}
impl Transport<RoleServer> for BoundedStdio {
    type Error = io::Error;
    fn send(
        &mut self,
        item: TxJsonRpcMessage<RoleServer>,
    ) -> impl std::future::Future<Output = io::Result<()>> + Send + 'static {
        let output = self.output.clone();
        async move {
            if serde_json::to_vec(&item)?.len() > MCP_BYTES {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "MCP frame too large",
                ));
            }
            output
                .lock()
                .await
                .send(item)
                .await
                .map_err(io::Error::other)
        }
    }
    async fn receive(&mut self) -> Option<RxJsonRpcMessage<RoleServer>> {
        self.input.next().await.and_then(Result::ok)
    }
    async fn close(&mut self) -> io::Result<()> {
        self.output
            .lock()
            .await
            .close()
            .await
            .map_err(io::Error::other)
    }
}
