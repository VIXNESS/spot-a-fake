-- Create analysis_detail table
CREATE TABLE analysis_detail (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    analysis_id UUID REFERENCES analysis(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL, -- Supabase Storage URL for detail images
    ai_confidence DECIMAL(5,4), -- AI confidence score (0.0000 to 1.0000)
    ai_result_text TEXT, -- AI analysis result text
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on analysis_id for better query performance
CREATE INDEX idx_analysis_detail_analysis_id ON analysis_detail(analysis_id);

-- Create updated_at trigger for analysis_detail table
CREATE TRIGGER update_analysis_detail_updated_at 
    BEFORE UPDATE ON analysis_detail 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE analysis_detail ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analysis_detail table

-- Policy 1: Users can view analysis_detail if they own it OR can view the parent analysis
CREATE POLICY "Users can view analysis_detail" ON analysis_detail
    FOR SELECT USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM analysis 
            WHERE analysis.id = analysis_detail.analysis_id 
            AND (
                analysis.user_id = auth.uid() 
                OR analysis.visibility = 'public'
            )
        )
    );

-- Policy 2: Users can create analysis_detail for analyses they own
CREATE POLICY "Users can create analysis_detail" ON analysis_detail
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM analysis 
            WHERE analysis.id = analysis_detail.analysis_id 
            AND analysis.user_id = auth.uid()
        )
    );

-- Policy 3: Users can update their own analysis_detail records
CREATE POLICY "Users can update own analysis_detail" ON analysis_detail
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own analysis_detail records
CREATE POLICY "Users can delete own analysis_detail" ON analysis_detail
    FOR DELETE USING (auth.uid() = user_id);

-- Policy 5: Admins can view all analysis_detail records
CREATE POLICY "Admins can view all analysis_detail" ON analysis_detail
    FOR SELECT USING (public.is_admin_user());

-- Policy 6: Admins can manage all analysis_detail records
CREATE POLICY "Admins can manage all analysis_detail" ON analysis_detail
    FOR ALL USING (public.is_admin_user());

-- Grant necessary permissions
GRANT ALL ON analysis_detail TO authenticated;
GRANT ALL ON analysis_detail TO service_role;