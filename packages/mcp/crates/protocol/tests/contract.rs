use stagistic_mcp_protocol::parse_request;

#[test]
fn rejects_unknown_operation_extra_fields_and_invalid_limits() {
    for input in [
        r#"{"protocol_version":1,"operation":{"tool":"delete_script","arguments":{}}}"#,
        r#"{"protocol_version":1,"operation":{"tool":"list_scripts","arguments":{"sql":"DROP TABLE scripts"}}}"#,
        r#"{"protocol_version":2,"operation":{"tool":"list_scripts","arguments":{}}}"#,
        r#"{"protocol_version":1,"operation":{"tool":"list_scripts","arguments":{"limit":0}}}"#,
        r#"{"protocol_version":1,"operation":{"tool":"list_scripts","arguments":{"limit":101}}}"#,
    ] {
        assert!(parse_request(input.as_bytes()).is_err(), "accepted {input}");
    }
}

#[test]
fn accepts_projection_ids_and_rejects_oversized_frames() {
    assert!(parse_request(br#"{"protocol_version":1,"operation":{"tool":"get_scene","arguments":{"script_id":"s","scene_id":"rw-scene:s:block-1"}}}"#).is_ok());
    assert!(parse_request(&vec![b' '; 16_385]).is_err());
}
