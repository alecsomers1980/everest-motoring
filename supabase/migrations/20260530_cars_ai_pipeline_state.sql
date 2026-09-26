-- Add a JSONB column to track in-progress AI walkaround pipeline state.
--
-- The new cron-driven pipeline (src/app/api/cron/advance-video/route.js)
-- reads and writes this column to advance car renders one step at a time
-- between cron ticks, eliminating the previous dependency on a browser tab
-- staying open for the full 8-12 minute render.
--
-- Shape (all keys optional, present only after the relevant phase):
--   {
--     "script":  [ {scene, location, visual_prompt, voiceover_text}, ... ],
--     "images":  [url1, url2, url3, url4],
--     "scenes":  [ {scene, task_id?, muxed_url?}, ... ],
--     "stitched_url": "https://..."
--   }
--
-- Set to NULL once the pipeline reaches a terminal state (cf:UID / error:).

ALTER TABLE cars
  ADD COLUMN IF NOT EXISTS ai_pipeline_state JSONB;

COMMENT ON COLUMN cars.ai_pipeline_state IS
  'In-progress AI walkaround pipeline state, advanced one phase per cron tick by /api/cron/advance-video. NULL when the render is terminal (cf:UID or error: state in video_url).';
