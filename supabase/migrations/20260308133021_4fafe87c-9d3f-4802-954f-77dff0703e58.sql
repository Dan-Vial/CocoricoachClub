
-- Create storage bucket for admin documents (PDF, images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-documents', 'admin-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to admin-documents bucket
CREATE POLICY "Authenticated users can upload admin documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'admin-documents');

-- Allow authenticated users to read admin documents
CREATE POLICY "Authenticated users can read admin documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'admin-documents');

-- Allow authenticated users to delete their own admin documents
CREATE POLICY "Authenticated users can delete admin documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'admin-documents');
