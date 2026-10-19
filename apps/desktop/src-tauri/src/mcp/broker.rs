use super::endpoint::open_endpoint;
use stagistic_mcp_protocol::{
    parse_request, ErrorCode, LocalRequest, ReadReply, UiReply, UiRequest, MAX_ACTIVE, REPLY_BYTES,
    REQUEST_BYTES,
};
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};
use tokio::{
    io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader},
    net::UnixStream,
    sync::{oneshot, Semaphore},
    task::JoinSet,
};
use tokio_util::sync::CancellationToken;

type UiDispatch = dyn Fn(UiRequest) -> Result<(), ()> + Send + Sync;
type Pending = HashMap<String, (String, oneshot::Sender<ReadReply>)>;
type Running = Option<(CancellationToken, tokio::task::JoinHandle<()>)>;

pub struct McpBroker {
    path: PathBuf,
    ui: Arc<UiDispatch>,
    enabled: AtomicBool,
    generation: Mutex<Option<String>>,
    pending: Mutex<Pending>,
    running: tokio::sync::Mutex<Running>,
    permits: Arc<Semaphore>,
}
struct PendingGuard {
    broker: Arc<McpBroker>,
    id: String,
}
impl Drop for PendingGuard {
    fn drop(&mut self) {
        self.broker.pending.lock().unwrap().remove(&self.id);
    }
}
impl McpBroker {
    pub fn new(path: PathBuf, ui: Arc<UiDispatch>) -> Arc<Self> {
        Arc::new(Self {
            path,
            ui,
            enabled: AtomicBool::new(false),
            generation: Mutex::new(None),
            pending: Mutex::new(HashMap::new()),
            running: tokio::sync::Mutex::new(None),
            permits: Arc::new(Semaphore::new(MAX_ACTIVE)),
        })
    }
    pub fn enabled(&self) -> bool {
        self.enabled.load(Ordering::SeqCst)
    }
    pub fn ready(&self) -> bool {
        self.generation.lock().unwrap().is_some()
    }

    pub async fn enable(self: &Arc<Self>) -> Result<(), String> {
        let mut running = self.running.lock().await;
        if running.is_some() {
            return Ok(());
        }
        let endpoint = open_endpoint(&self.path)
            .await
            .map_err(|_| "Local MCP endpoint could not be opened.")?;
        let cancel = CancellationToken::new();
        let stopped = cancel.clone();
        let broker = self.clone();
        self.enabled.store(true, Ordering::SeqCst);
        let task = tokio::spawn(async move {
            let mut jobs = JoinSet::new();
            loop {
                tokio::select! {
                    _ = stopped.cancelled() => break,
                    _ = jobs.join_next(), if !jobs.is_empty() => {},
                    connection = endpoint.listener.accept() => {
                        let Ok((mut stream, _)) = connection else { break; };
                        let permit = match broker.permits.clone().try_acquire_owned() {
                            Ok(permit) => permit,
                            Err(_) => {
                                let data = serde_json::to_string(&ReadReply::error(ErrorCode::Busy, "Local MCP is busy.")).unwrap() + "\n";
                                let _ = tokio::time::timeout(Duration::from_millis(100), stream.write_all(data.as_bytes())).await;
                                continue;
                            }
                        };
                        let broker = broker.clone();
                        jobs.spawn(async move {
                            let _permit = permit;
                            let _ = tokio::time::timeout(Duration::from_secs(11), broker.serve_connection(stream)).await;
                        });
                    }
                }
            }
            jobs.abort_all();
            while jobs.join_next().await.is_some() {}
            drop(endpoint);
        });
        *running = Some((cancel, task));
        Ok(())
    }
    pub async fn disable(&self) {
        let mut running = self.running.lock().await;
        self.enabled.store(false, Ordering::SeqCst);
        self.pending.lock().unwrap().clear();
        if let Some((cancel, task)) = running.take() {
            cancel.cancel();
            let _ = task.await;
        }
    }
    pub fn attach(&self) -> String {
        let mut current = self.generation.lock().unwrap();
        let generation = uuid::Uuid::new_v4().to_string();
        self.pending.lock().unwrap().clear();
        *current = Some(generation.clone());
        generation
    }
    pub fn detach(&self, generation: &str) {
        let mut current = self.generation.lock().unwrap();
        if current.as_deref() == Some(generation) {
            *current = None;
            self.pending.lock().unwrap().clear();
        }
    }
    pub fn invalidate(&self) {
        let mut current = self.generation.lock().unwrap();
        *current = None;
        self.pending.lock().unwrap().clear();
    }
    pub fn submit_reply(&self, reply: UiReply) -> Result<(), String> {
        if !self.enabled() {
            return Err("Integration disabled".into());
        }
        if serde_json::to_vec(&reply.reply).map_or(true, |bytes| bytes.len() > REPLY_BYTES) {
            return Err("Invalid reply".into());
        }
        let valid = match &reply.reply {
            ReadReply::Success { ok, .. } => *ok,
            ReadReply::Failure { ok, .. } => !ok,
        };
        if !valid {
            return Err("Invalid reply".into());
        }
        let current = self.generation.lock().unwrap();
        if current.as_deref() != Some(&reply.generation) {
            return Err("Expired generation".into());
        }
        let mut pending = self.pending.lock().unwrap();
        if pending
            .get(&reply.request_id)
            .is_none_or(|(generation, _)| generation != &reply.generation)
        {
            return Err("Unknown request".into());
        }
        if let Some((_, sender)) = pending.remove(&reply.request_id) {
            let _ = sender.send(reply.reply);
        }
        Ok(())
    }
    pub async fn dispatch(self: &Arc<Self>, request: LocalRequest) -> ReadReply {
        if !self.enabled() {
            return ReadReply::error(
                ErrorCode::IntegrationDisabled,
                "Enable local MCP access in Stagistic.",
            );
        }
        let bytes = serde_json::to_vec(&request).unwrap_or_default();
        if parse_request(&bytes).is_err() {
            return ReadReply::error(ErrorCode::InvalidArgument, "Invalid read request.");
        }
        let id = uuid::Uuid::new_v4().to_string();
        let (sender, receiver) = oneshot::channel();
        let generation = {
            let current = self.generation.lock().unwrap();
            let Some(generation) = current.clone() else {
                return ReadReply::error(
                    ErrorCode::AppNotReady,
                    "Stagistic is starting or reloading.",
                );
            };
            let mut pending = self.pending.lock().unwrap();
            if !self.enabled() {
                return ReadReply::error(
                    ErrorCode::IntegrationDisabled,
                    "Local MCP access is disabled.",
                );
            }
            if pending.len() >= MAX_ACTIVE {
                return ReadReply::error(ErrorCode::Busy, "Local MCP is busy.");
            }
            pending.insert(id.clone(), (generation.clone(), sender));
            generation
        };
        let _guard = PendingGuard {
            broker: self.clone(),
            id: id.clone(),
        };
        if (self.ui)(UiRequest {
            generation,
            request_id: id,
            request,
        })
        .is_err()
        {
            return ReadReply::error(ErrorCode::AppNotReady, "Stagistic is not ready.");
        }
        match tokio::time::timeout(Duration::from_secs(10), receiver).await {
            Ok(Ok(reply)) => reply,
            Ok(Err(_)) => ReadReply::error(
                ErrorCode::AppNotReady,
                "Stagistic disconnected or reloaded.",
            ),
            Err(_) => ReadReply::error(ErrorCode::Timeout, "Stagistic did not respond in time."),
        }
    }
    async fn serve_connection(self: Arc<Self>, stream: UnixStream) -> std::io::Result<()> {
        let deadline = tokio::time::Instant::now() + Duration::from_secs(10);
        let mut reader = BufReader::new(stream);
        let mut frame = Vec::new();
        let framed = tokio::time::timeout_at(
            deadline,
            (&mut reader)
                .take((REQUEST_BYTES + 2) as u64)
                .read_until(b'\n', &mut frame),
        )
        .await;
        if framed.is_err() {
            let data = serde_json::to_string(&ReadReply::error(
                ErrorCode::Timeout,
                "Local MCP request timed out.",
            ))
            .unwrap()
                + "\n";
            return reader.get_mut().write_all(data.as_bytes()).await;
        }
        framed.unwrap()?;
        let reply = if frame.last() != Some(&b'\n') {
            ReadReply::error(ErrorCode::InvalidArgument, "Incomplete request.")
        } else {
            frame.pop();
            match parse_request(&frame) {
                Ok(request) => {
                    let mut extra = [0u8; 1];
                    tokio::select! {
                        reply = tokio::time::timeout_at(deadline, self.dispatch(request)) => reply.unwrap_or_else(|_| ReadReply::error(ErrorCode::Timeout, "Stagistic did not respond in time.")),
                        _ = reader.read(&mut extra) => return Ok(()),
                    }
                }
                Err(code) => ReadReply::error(
                    if code == "VERSION_MISMATCH" {
                        ErrorCode::VersionMismatch
                    } else {
                        ErrorCode::InvalidArgument
                    },
                    "Invalid local MCP request.",
                ),
            }
        };
        let mut data = serde_json::to_vec(&reply)?;
        data.push(b'\n');
        reader.get_mut().write_all(&data).await
    }
}
