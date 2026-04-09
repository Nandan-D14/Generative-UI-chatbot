import { useState, useCallback } from 'react';

export function useKnowledgeBase() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDocuments = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/kb/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setDocuments(await res.json());
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
    setIsLoading(false);
  }, []);

  const uploadDocument = useCallback(async (file: File, token: string) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await fetch('/api/kb/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setIsUploading(false);
  }, []);

  const deleteDocument = useCallback(async (id: string, token: string) => {
    await fetch(`/api/kb/documents/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }, []);

  return { documents, isUploading, isLoading, fetchDocuments, uploadDocument, deleteDocument };
}
