#[tokio::main]
async fn main() {
    if std::env::args().nth(1).as_deref() == Some("--version") {
        println!("stagistic-mcp {} protocol=1", env!("CARGO_PKG_VERSION"));
        return;
    }
    if stagistic_mcp::run_stdio().await.is_err() {
        eprintln!("Stagistic MCP transport closed.");
        std::process::exit(1);
    }
}
