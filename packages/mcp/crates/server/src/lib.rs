mod stdio;
mod tools;
pub mod transport;

use rmcp::ServiceExt;

pub async fn run_stdio() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let service = tools::StagisticServer
        .serve(stdio::BoundedStdio::new())
        .await?;
    service.waiting().await?;
    Ok(())
}
