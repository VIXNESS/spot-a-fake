-- SQL commands to update existing analysis_detail table in Supabase
-- Add the two new columns: ai_confidence and ai_result_text

-- Add ai_confidence column (DECIMAL for precise confidence scores 0.0000 to 1.0000)
ALTER TABLE analysis_detail 
ADD COLUMN ai_confidence DECIMAL(5,4);

-- Add ai_result_text column (TEXT for AI analysis results)
ALTER TABLE analysis_detail 
ADD COLUMN ai_result_text TEXT;

-- Optional: Add comments to document the new columns
COMMENT ON COLUMN analysis_detail.ai_confidence IS 'AI confidence score (0.0000 to 1.0000)';
COMMENT ON COLUMN analysis_detail.ai_result_text IS 'AI analysis result text';

-- Optional: Create an index on ai_confidence if you plan to query/filter by confidence levels
-- CREATE INDEX idx_analysis_detail_ai_confidence ON analysis_detail(ai_confidence);
