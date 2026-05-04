UPDATE storage.buckets 
SET file_size_limit = 104857600,
    allowed_mime_types = ARRAY[
      'image/jpeg','image/png','image/gif','image/webp','image/svg+xml','image/heic','image/heif',
      'application/pdf','text/plain','application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'audio/mpeg','audio/wav','audio/webm','audio/ogg','audio/mp4','audio/aac',
      'video/mp4','video/webm','video/quicktime','video/x-msvideo','video/x-matroska','video/3gpp','video/ogg'
    ]
WHERE id = 'message-attachments';