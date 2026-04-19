import { useState, useCallback } from 'react';

export type KnowledgeBaseDocument = {
  id: string;
  name: string;
  type: string;
  size: number;
  chunk_count: number;
  status: 'processing' | 'indexed' | 'failed';
  error_message: string | null;
  created_at: number;
};

type UploadResult = {
  id: string;
  status: 'indexed' | 'failed';
  chunkCount: number;
  errorMessage?: string;
};

export function useKnowledgeBase() {
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/kb/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to load documents.');
      }

      setDocuments(await res.json());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadDocument = useCallback(async (file: File, token: string) => {
    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/kb/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const payload = await res.json().catch(() => ({})) as Partial<UploadResult> & { error?: string };

      await fetchDocuments(token);

      if (!res.ok) {
        const message = payload.errorMessage || payload.error || 'Upload failed.';
        setError(message);
        throw new Error(message);
      }

      return payload as UploadResult;
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed.');
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [fetchDocuments]);

  const deleteDocument = useCallback(async (id: string, token: string) => {
    setError(null);

    const res = await fetch(`/api/kb/documents/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({})) as { error?: string };
      const message = payload.error || 'Delete failed.';
      setError(message);
      throw new Error(message);
    }

    await fetchDocuments(token);
  }, [fetchDocuments]);

  return { documents, isUploading, isLoading, error, fetchDocuments, uploadDocument, deleteDocument };
}
