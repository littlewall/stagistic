use rmcp::{model::*, service::RequestContext, ErrorData, RoleServer, ServerHandler};
use serde_json::{json, Value};
use stagistic_mcp_protocol::{
    endpoint_path, parse_request, tool_definitions, ErrorCode, ReadReply, PROTOCOL_VERSION,
};

pub struct StagisticServer;

impl ServerHandler for StagisticServer {
    fn get_info(&self) -> ServerConfig {
        let mut info = ServerConfig::new(
            ServerCapabilities::builder()
                .enable_tools()
                .enable_prompts()
                .build(),
        );
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
            result = CallToolResult::error(vec![ContentBlock::text(
                "{\"code\":\"CONTENT_TOO_LARGE\",\"message\":\"The result exceeds the MCP message limit.\"}",
            )]);
        }
        Ok(result.into())
    }

    async fn list_prompts(
        &self,
        _: Option<PaginatedRequestParams>,
        _: RequestContext<RoleServer>,
    ) -> Result<ListPromptsResult, ErrorData> {
        Ok(ListPromptsResult {
            prompts: prompt_definitions(),
            ..Default::default()
        })
    }

    async fn get_prompt(
        &self,
        request: GetPromptRequestParams,
        _: RequestContext<RoleServer>,
    ) -> Result<GetPromptResponse, ErrorData> {
        let (description, text) = render_prompt(&request.name, request.arguments.as_ref())
            .ok_or_else(|| {
                ErrorData::invalid_params(format!("Unknown prompt: {}", request.name), None)
            })?;
        let message = PromptMessage::new_text(Role::User, text);
        let mut result = GetPromptResult::new(vec![message]);
        result.description = Some(description);
        Ok(GetPromptResponse::Complete(result))
    }
}

fn prompt_definitions() -> Vec<Prompt> {
    vec![
        Prompt::new(
            "check-scene-engine",
            Some("Active drafting check: Analyzes objectives, obstacles, tactics, and value shift within a specific scene. Use when writing or diagnosing why a scene stalls."),
            Some(vec![
                PromptArgument::new("script_id")
                    .with_description("The ID of the script")
                    .with_required(true),
                PromptArgument::new("scene_id")
                    .with_description("The ID of the scene to analyze")
                    .with_required(true),
            ]),
        ).with_title("Check Scene Engine & Conflict Progression"),

        Prompt::new(
            "check-character-voice",
            Some("Active drafting check: Checks speech rhythms, vocabulary distinctiveness, ping-pong vs monologue balance, and flags 'As you know, Bob' exposition traps."),
            Some(vec![
                PromptArgument::new("script_id")
                    .with_description("The ID of the script")
                    .with_required(true),
                PromptArgument::new("scene_id")
                    .with_description("Optional scene ID to narrow the check")
                    .with_required(false),
                PromptArgument::new("character_id")
                    .with_description("Optional character ID to focus on")
                    .with_required(false),
            ]),
        ).with_title("Check Character Voice & Dialogue Dynamics"),

        Prompt::new(
            "check-song-transition",
            Some("Musical theater check: Evaluates whether emotional tension in dialogue builds sufficiently to justify bursting into song, and flags lyric redundancy."),
            Some(vec![
                PromptArgument::new("script_id")
                    .with_description("The ID of the script")
                    .with_required(true),
                PromptArgument::new("scene_id")
                    .with_description("The ID of the scene with the music cue")
                    .with_required(true),
            ]),
        ).with_title("Check Song Transition & Musical Escalation ('Why Sing?')"),

        Prompt::new(
            "audit-epistemic-timeline",
            Some("Post-draft audit: Traces character knowledge, reveals, lies, and emotional continuity across all scenes. Detects anachronisms after scene restructuring."),
            Some(vec![
                PromptArgument::new("script_id")
                    .with_description("The ID of the script")
                    .with_required(true),
                PromptArgument::new("character_id")
                    .with_description("Optional character ID to trace specifically")
                    .with_required(false),
            ]),
        ).with_title("Audit Epistemic Timeline & Character Knowledge"),

        Prompt::new(
            "audit-stage-logistics",
            Some("Post-draft audit: Checks physical feasibility on stage: French scenes, character entrances/exits, impossible costume changes, and ghost characters."),
            Some(vec![
                PromptArgument::new("script_id")
                    .with_description("The ID of the script")
                    .with_required(true),
            ]),
        ).with_title("Audit Stage Logistics & Quick Changes"),

        Prompt::new(
            "audit-musical-architecture",
            Some("Post-draft audit: Evaluates the macro pacing of the musical score, song distribution, Act I climax, and tracks Chekhov's guns and dramatic payoffs."),
            Some(vec![
                PromptArgument::new("script_id")
                    .with_description("The ID of the script")
                    .with_required(true),
            ]),
        ).with_title("Audit Musical Architecture & Setup/Payoffs"),
    ]
}

fn render_prompt(
    name: &str,
    args: Option<&serde_json::Map<String, Value>>,
) -> Option<(String, String)> {
    let script_id = args
        .and_then(|a| a.get("script_id"))
        .and_then(|v| v.as_str())
        .unwrap_or("{script_id}");
    let scene_id = args
        .and_then(|a| a.get("scene_id"))
        .and_then(|v| v.as_str())
        .unwrap_or("{scene_id}");
    let character_id = args
        .and_then(|a| a.get("character_id"))
        .and_then(|v| v.as_str())
        .unwrap_or("{character_id}");

    match name {
        "check-scene-engine" => Some((
            "Check Scene Engine & Conflict Progression".into(),
            format!(
                "You are an expert dramatic consultant and playwright. Please analyze the scene engine and conflict for the given scene.\n\n\
                1. Retrieve scene text and telemetry using `get_scene` and `get_scene_telemetry` for `script_id: \"{}\"` and `scene_id: \"{}\"`.\n\
                2. Identify:\n\
                   - Character Objectives: What does each character want in this scene?\n\
                   - Conflict & Obstacles: What stands in their way?\n\
                   - Tactics: How do they attempt to achieve their objectives?\n\
                   - Value Shift: Does the scene end with a clear change in the status quo, or does it end where it started?\n\
                3. Format your findings in a structured Markdown report:\n\
                   - Use clickable links `[Block Title](stagistic://script/{}/editor?block={{block_id}})` to link directly to turning points and key speeches.\n\
                   - Classify findings as Critical (no value shift) or Warning (repetitive tactics).",
                script_id, scene_id, script_id
            ),
        )),
        "check-character-voice" => Some((
            "Check Character Voice & Dialogue Dynamics".into(),
            format!(
                "You are an expert dialogue doctor and playwright. Analyze character voices and dialogue dynamics in the specified script.\n\n\
                1. Use `get_scene_telemetry` (or `get_character_dialogue` / `get_characters`) for `script_id: \"{}\"` (scene: \"{}\", character: \"{}\") to inspect speech lengths, vocabulary, and monologue ratios.\n\
                2. Verify:\n\
                   - Idiolect: Do characters sound distinct or do they all share the author's voice?\n\
                   - Speech Rhythm: Are exchanges varied in tempo, or monotonous ping-pong?\n\
                   - Exposition Traps: Flag any 'As you know, Bob' dialogue where characters tell each other things they already know solely for the audience.\n\
                3. Format your report with clickable links `[Speech](stagistic://script/{}/editor?block={{block_id}})` to pinpoint flagged speeches.",
                script_id, scene_id, character_id, script_id
            ),
        )),
        "check-song-transition" => Some((
            "Check Song Transition & Musical Escalation ('Why Sing?')".into(),
            format!(
                "You are a seasoned musical theatre bookwriter and dramaturg. Analyze the transition from spoken dialogue into song for the music cue in this scene.\n\n\
                1. Call `get_scene_telemetry` and `get_scene` for `script_id: \"{}\"` and `scene_id: \"{}\"`.\n\
                2. Evaluate:\n\
                   - Emotional Pressure: Has the spoken dialogue reached a pitch where words alone are no longer enough, necessitating song?\n\
                   - Lyrical Redundancy: Did the dialogue immediately preceding the song already state the point of the song, making the opening lyrics repetitive?\n\
                3. Provide a structured report with clickable links `[Block](stagistic://script/{}/editor?block={{block_id}})` for the song lead-in and cue start.",
                script_id, scene_id, script_id
            ),
        )),
        "audit-epistemic-timeline" => Some((
            "Audit Epistemic Timeline & Character Knowledge".into(),
            format!(
                "You are a master script editor and dramaturg. Audit character epistemic timeline and causality across the entire draft.\n\n\
                1. Retrieve the outline with `get_script_outline`, list characters with `get_characters`, and inspect scenes where key secrets or plot revelations occur for `script_id: \"{}\"`.\n\
                2. Trace:\n\
                   - Knowledge Chronology: Who knows what, and when/where did they learn it?\n\
                   - Anachronisms: Does any character act upon or reference information before it was revealed to them?\n\
                   - Emotional Aftermath: After a major revelation or shock, does the character's subsequent appearance reflect the emotional consequence?\n\
                3. Format your report with a timeline table and actionable links `[Scene/Block](stagistic://script/{}/editor?block={{block_id}})`.",
                script_id, script_id
            ),
        )),
        "audit-stage-logistics" => Some((
            "Audit Stage Logistics & Quick Changes".into(),
            format!(
                "You are a theater production manager and stage director. Audit the physical and logistical feasibility of the staging.\n\n\
                1. Retrieve stage logistics data with `get_stage_logistics` for `script_id: \"{}\"`.\n\
                2. Analyze:\n\
                   - Quick Changes: Highlight characters with <= 2 intervening speeches between scenes (Critical risk) and <= 5 speeches (Warning risk).\n\
                   - Abandoned / Ghost Characters: Flag characters who enter or are listed on stage but have no lines or exit.\n\
                   - Ensemble Doubling feasibility.\n\
                3. Present a clear French Scene matrix and list each logistical risk with clickable links `[Location](stagistic://script/{}/editor?block={{block_id}})`.",
                script_id, script_id
            ),
        )),
        "audit-musical-architecture" => Some((
            "Audit Musical Architecture & Setup/Payoffs".into(),
            format!(
                "You are a senior musical theatre dramaturg. Audit the macro architecture of the musical draft.\n\n\
                1. Review the outline (`get_script_outline`) and search for recurring motifs or props (`search_script`) for `script_id: \"{}\"`.\n\
                2. Examine:\n\
                   - Song Placement & Rhythm: Is there a clear early 'I Want' song? Does the Act I finale provide an energetic climax? Are ballads and upbeat numbers well balanced?\n\
                   - Plant & Payoff: Trace introduced props (Chekhov's guns), secrets, and promises to ensure they are paid off before the final curtain without deus-ex-machina endings.\n\
                3. Formulate your findings into a comprehensive diagnostic report with direct `[Reference](stagistic://script/{}/editor?block={{block_id}})` links.",
                script_id, script_id
            ),
        )),
        _ => None,
    }
}
