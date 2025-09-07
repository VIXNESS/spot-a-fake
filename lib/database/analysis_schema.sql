-- Create visibility enum for the analysis table
CREATE TYPE analysis_visibility AS ENUM ('private', 'public');

-- Create analysis table
CREATE TABLE analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL, -- Supabase Storage URL
    visibility analysis_visibility DEFAULT 'private'::analysis_visibility NOT NULL,
    ai_confidence DECIMAL(5,4), -- AI confidence score (0.0000 to 1.0000)
    ai_result_text TEXT, -- AI analysis result text
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger for analysis table
CREATE TRIGGER update_analysis_updated_at 
    BEFORE UPDATE ON analysis 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analysis table

-- Policy 1: Users can view their own analysis records
CREATE POLICY "Users can view own analysis" ON analysis
    FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Users can view public analysis records from others
CREATE POLICY "Users can view public analysis" ON analysis
    FOR SELECT USING (visibility = 'public');

-- Policy 3: Users can insert their own analysis records
CREATE POLICY "Users can create own analysis" ON analysis
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can update their own analysis records
CREATE POLICY "Users can update own analysis" ON analysis
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 5: Users can delete their own analysis records
CREATE POLICY "Users can delete own analysis" ON analysis
    FOR DELETE USING (auth.uid() = user_id);

-- Policy 6: Admins can view all analysis records
CREATE POLICY "Admins can view all analysis" ON analysis
    FOR SELECT USING (public.is_admin_user());

-- Policy 7: Admins can update all analysis records
CREATE POLICY "Admins can update all analysis" ON analysis
    FOR UPDATE USING (public.is_admin_user());

-- Policy 8: Admins can delete all analysis records
CREATE POLICY "Admins can delete all analysis" ON analysis
    FOR DELETE USING (public.is_admin_user());

-- Grant necessary permissions
GRANT ALL ON analysis TO authenticated;
GRANT ALL ON analysis TO service_role;
GRANT USAGE ON TYPE analysis_visibility TO authenticated, anon;