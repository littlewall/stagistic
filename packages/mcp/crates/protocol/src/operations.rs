use schemars::{schema_for, JsonSchema};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct LocalRequest {
    pub protocol_version: u32,
    pub operation: ReadOperation,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(
    tag = "tool",
    content = "arguments",
    rename_all = "snake_case",
    deny_unknown_fields
)]
pub enum ReadOperation {
    ListScripts(ListArgs),
    GetScriptOutline(ScriptArgs),
    GetScene(SceneArgs),
    GetScriptExcerpt(ExcerptArgs),
    GetCharacters(ScriptArgs),
    GetCharacterDialogue(DialogueArgs),
    SearchScript(SearchArgs),
    GetStageLogistics(ScriptArgs),
    GetSceneTelemetry(SceneArgs),
}

macro_rules! args {
    ($name:ident { $($field:ident : $ty:ty),* $(,)? }) => {
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
        #[serde(deny_unknown_fields)]
        pub struct $name {
            $(pub $field: $ty,)*
            #[schemars(range(min = 1, max = 100))]
            pub limit: Option<usize>,
            #[schemars(length(max = 8192))]
            pub cursor: Option<String>,
        }
    }
}
args!(ListArgs {});
args!(ScriptArgs { script_id: String });
args!(SceneArgs {
    script_id: String,
    scene_id: String
});
args!(ExcerptArgs { script_id: String, start_block_id: Option<String> });
args!(DialogueArgs { script_id: String, character_id: String, scene_id: Option<String> });
args!(SearchArgs { script_id: String, query: String, scene_id: Option<String>, block_type: Option<String> });

impl ReadOperation {
    pub fn validate(&self) -> Result<(), String> {
        let value = serde_json::to_value(self).map_err(|_| "INVALID_ARGUMENT")?;
        let args = &value["arguments"];
        let max = if matches!(self, Self::SearchScript(_)) {
            50
        } else {
            100
        };
        if let Some(limit) = args["limit"].as_u64() {
            if limit == 0 || limit > max {
                return Err("INVALID_ARGUMENT".into());
            }
        }
        for (key, value) in args.as_object().ok_or("INVALID_ARGUMENT")? {
            if let Some(text) = value.as_str() {
                let max = match key.as_str() {
                    "query" => 512,
                    "cursor" => 8192,
                    _ => 2048,
                };
                if text.trim().is_empty() || text.chars().count() > max {
                    return Err("INVALID_ARGUMENT".into());
                }
            }
        }
        Ok(())
    }
}

pub fn tool_definitions() -> Vec<Value> {
    let specs = [
        (
            "list_scripts",
            "List local script summaries without script text.",
            schema_for!(ListArgs),
        ),
        (
            "get_script_outline",
            "Read acts, scenes and existing synopses before requesting text.",
            schema_for!(ScriptArgs),
        ),
        (
            "get_scene",
            "Read one paginated scene in Stagistic syntax with original context.",
            schema_for!(SceneArgs),
        ),
        (
            "get_script_excerpt",
            "Read paginated Stagistic fragments, including text outside scenes.",
            schema_for!(ExcerptArgs),
        ),
        (
            "get_characters",
            "List confirmed characters and separately identified unconfirmed references.",
            schema_for!(ScriptArgs),
        ),
        (
            "get_character_dialogue",
            "Read whole speeches attributed to a confirmed character, optionally in a scene.",
            schema_for!(DialogueArgs),
        ),
        (
            "search_script",
            "Search local script text; use returned block or scene IDs to read context.",
            schema_for!(SearchArgs),
        ),
        (
            "get_stage_logistics",
            "Read scene-by-scene character presence, entrance/exit sequences and quick-change intervals across all scenes.",
            schema_for!(ScriptArgs),
        ),
        (
            "get_scene_telemetry",
            "Read detailed dialogue metrics, speech breakdown, pace and attached music cues for a single scene.",
            schema_for!(SceneArgs),
        ),
    ];
    specs.into_iter().map(|(name, description, schema)| json!({
        "name": name, "description": description, "inputSchema": schema,
        "annotations": {"readOnlyHint": true, "destructiveHint": false, "idempotentHint": true, "openWorldHint": false}
    })).collect()
}
