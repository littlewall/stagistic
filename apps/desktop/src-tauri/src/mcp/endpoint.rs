use fs2::FileExt;
use std::{
    fs::{self, DirBuilder, File, OpenOptions},
    io,
    os::unix::fs::{DirBuilderExt, FileTypeExt, MetadataExt, OpenOptionsExt, PermissionsExt},
    path::{Path, PathBuf},
};
use tokio::net::{UnixListener, UnixStream};

pub struct EndpointGuard {
    pub listener: UnixListener,
    path: PathBuf,
    inode: u64,
    _lock: File,
}
fn reject() -> io::Error {
    io::Error::new(io::ErrorKind::PermissionDenied, "Unsafe local MCP endpoint")
}

pub async fn open_endpoint(path: &Path) -> io::Result<EndpointGuard> {
    let parent = path.parent().ok_or_else(reject)?;
    if path.as_os_str().len() >= 104 {
        return Err(reject());
    }
    match DirBuilder::new().mode(0o700).create(parent) {
        Ok(()) => (),
        Err(error) if error.kind() == io::ErrorKind::AlreadyExists => (),
        Err(error) => return Err(error),
    }
    let uid = unsafe { libc::getuid() };
    let dir = fs::symlink_metadata(parent)?;
    if !dir.is_dir() || dir.uid() != uid || dir.mode() & 0o777 != 0o700 {
        return Err(reject());
    }
    let lock = OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .mode(0o600)
        .custom_flags(libc::O_NOFOLLOW)
        .open(parent.join("lock"))?;
    let metadata = lock.metadata()?;
    if !metadata.is_file() || metadata.uid() != uid || metadata.mode() & 0o777 != 0o600 {
        return Err(reject());
    }
    lock.try_lock_exclusive()?;
    if let Ok(existing) = fs::symlink_metadata(path) {
        if !existing.file_type().is_socket() || existing.uid() != uid {
            return Err(reject());
        }
        match tokio::time::timeout(
            std::time::Duration::from_millis(200),
            UnixStream::connect(path),
        )
        .await
        {
            Ok(Err(error))
                if matches!(
                    error.kind(),
                    io::ErrorKind::ConnectionRefused | io::ErrorKind::NotFound
                ) =>
            {
                fs::remove_file(path)?
            }
            _ => {
                return Err(io::Error::new(
                    io::ErrorKind::AddrInUse,
                    "Local MCP endpoint already active",
                ))
            }
        }
    }
    let listener = UnixListener::bind(path)?;
    fs::set_permissions(path, fs::Permissions::from_mode(0o600))?;
    let inode = fs::symlink_metadata(path)?.ino();
    Ok(EndpointGuard {
        listener,
        path: path.into(),
        inode,
        _lock: lock,
    })
}
impl Drop for EndpointGuard {
    fn drop(&mut self) {
        if fs::symlink_metadata(&self.path)
            .is_ok_and(|meta| meta.ino() == self.inode && meta.file_type().is_socket())
        {
            let _ = fs::remove_file(&self.path);
        }
    }
}
