ALTER TABLE scripts ADD COLUMN summary_metadata jsonb;

WITH ordered_blocks AS (
    SELECT script_id, block_type,
        sum(CASE WHEN block_type = 'act' THEN 1 ELSE 0 END) OVER (
            PARTITION BY script_id ORDER BY block_order, id ROWS UNBOUNDED PRECEDING
        ) AS act_index
    FROM script_blocks
), scene_counts AS (
    SELECT script_id, act_index,
        count(*) FILTER (WHERE block_type = 'scene') AS scene_count
    FROM ordered_blocks
    GROUP BY script_id, act_index
), summaries AS (
    SELECT script_id, sum(scene_count) AS scene_count,
        jsonb_agg(scene_count ORDER BY act_index) FILTER (WHERE act_index > 0) AS act_scene_counts,
        sum(scene_count) FILTER (WHERE act_index = 0) AS unassigned_scene_count
    FROM scene_counts
    GROUP BY script_id
)
UPDATE scripts AS target
SET summary_metadata = jsonb_build_object(
    'pageCount', NULL,
    'sceneCount', coalesce(summaries.scene_count, 0),
    'actSceneCounts', coalesce(summaries.act_scene_counts, '[]'::jsonb),
    'unassignedSceneCount', coalesce(summaries.unassigned_scene_count, 0)
)
FROM scripts AS source LEFT JOIN summaries ON summaries.script_id = source.id
WHERE target.id = source.id;
