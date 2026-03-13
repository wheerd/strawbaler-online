-- Add floor_plans_state column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS floor_plans_state JSONB NOT NULL DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS floor_plans_version INT DEFAULT 1;

-- Create floor-plans storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('floor-plans', 'floor-plans', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
-- Path structure: floor-plans/{user_id}/{hash}.{ext}
CREATE POLICY "Users can view own floor plans"
  ON storage.objects FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'sub') = owner_id);

CREATE POLICY "Users can insert own floor plans"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'floor-plans'
    AND (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  );

CREATE POLICY "Users can update own floor plans"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = owner_id);

CREATE POLICY "Users can delete own floor plans"
  ON storage.objects FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'sub') = owner_id);
