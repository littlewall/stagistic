use stagistic_editor::mcp::install::{atomic_copy, prepare_manual};
use std::{fs, os::unix::fs::PermissionsExt};

#[test]
fn manual_config_uses_the_actual_unicode_path_and_preserves_bytes_without_enabling() {
    let root = tempfile::tempdir().unwrap();
    let resource = root.path().join("resource");
    let data = root.path().join("A writer ž/Library/Application Support");
    fs::create_dir_all(resource.join("mcp")).unwrap();
    let source = resource.join("mcp/stagistic-mcp");
    let expected = format!(
        "stagistic-mcp {} protocol={}",
        stagistic_mcp_protocol::BRIDGE_VERSION,
        stagistic_mcp_protocol::PROTOCOL_VERSION
    );
    let bytes = format!("#!/bin/sh\nprintf '%s\\n' '{expected}'\n");
    fs::write(&source, &bytes).unwrap();
    fs::set_permissions(&source, fs::Permissions::from_mode(0o755)).unwrap();
    let config = prepare_manual(&resource, &data).unwrap();
    let target = data.join("mcp/server/stagistic-mcp");
    assert_eq!(config.command, target.to_str().unwrap());
    assert!(config.args.is_empty());
    assert_eq!(fs::read_to_string(&target).unwrap(), bytes);
    assert_eq!(
        fs::metadata(&target).unwrap().permissions().mode() & 0o777,
        0o700
    );
    assert!(!data.join("mcp/enabled").exists());
    let output = std::process::Command::new(&config.command)
        .args(&config.args)
        .output()
        .unwrap();
    assert!(output.status.success());
    assert_eq!(String::from_utf8(output.stdout).unwrap().trim(), expected);
    assert_eq!(
        prepare_manual(&resource, &data).unwrap().command,
        config.command
    );
}

#[test]
fn failed_preparation_preserves_previous_working_executable() {
    let root = tempfile::tempdir().unwrap();
    let resource = root.path().join("resource");
    let data = root.path().join("A writer ž/Library");
    fs::create_dir_all(resource.join("mcp")).unwrap();
    fs::create_dir_all(data.join("mcp/server")).unwrap();
    let target = data.join("mcp/server/stagistic-mcp");
    fs::write(&target, "previous executable").unwrap();
    let source = resource.join("mcp/stagistic-mcp");
    fs::write(&source, "#!/bin/sh\nexit 1\n").unwrap();
    fs::set_permissions(&source, fs::Permissions::from_mode(0o700)).unwrap();
    assert!(prepare_manual(&resource, &data).is_err());
    assert_eq!(fs::read_to_string(&target).unwrap(), "previous executable");
    assert!(atomic_copy(&resource.join("missing"), &target, 0o700).is_err());
    assert_eq!(fs::read_to_string(&target).unwrap(), "previous executable");
}
