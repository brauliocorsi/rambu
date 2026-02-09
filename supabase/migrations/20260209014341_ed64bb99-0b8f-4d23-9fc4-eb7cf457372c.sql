-- Add file columns to messages table
ALTER TABLE public.messages 
  ADD COLUMN file_url TEXT,
  ADD COLUMN file_type TEXT,
  ADD COLUMN file_name TEXT;

-- Add file columns to dm_messages table
ALTER TABLE public.dm_messages 
  ADD COLUMN file_url TEXT,
  ADD COLUMN file_type TEXT,
  ADD COLUMN file_name TEXT;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Storage policies for message-attachments bucket
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'message-attachments');

CREATE POLICY "Anyone can view attachments"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'message-attachments');

CREATE POLICY "Users can delete own attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);