-- Configure floor-plans bucket with file size and mime type restrictions
UPDATE storage.buckets 
SET 
  file_size_limit = 5242880,  -- 5MB
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
WHERE id = 'floor-plans';
