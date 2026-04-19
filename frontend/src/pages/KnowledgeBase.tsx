import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { UploadZone } from '../components/kb/UploadZone';
import { DocumentTable } from '../components/kb/DocumentTable';
import { useKnowledgeBase } from '../hooks/useKnowledgeBase';

export function KnowledgeBasePage() {
  const { getToken } = useAuth();
  const { documents, isUploading, isLoading, error, fetchDocuments, uploadDocument, deleteDocument } = useKnowledgeBase();

  useEffect(() => {
    getToken().then((token) => {
      if (token) {
        return fetchDocuments(token);
      }
    });
  }, [fetchDocuments, getToken]);

  const handleUpload = async (file: File) => {
    const token = await getToken();
    if (token) {
      try {
        await uploadDocument(file, token);
      } catch {
        // Upload errors are surfaced in the hook state and failed document rows.
      }
    }
  };

  const handleDelete = async (id: string) => {
    const token = await getToken();
    if (token) {
      try {
        await deleteDocument(id, token);
      } catch {
        // Delete errors are surfaced in the hook state.
      }
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Knowledge Base</h1>
      <p className="mb-4 max-w-3xl text-sm text-neutral-500">
        Upload PDFs, CSVs, and plain-text files. Indexed chunks stay scoped to your account and are retrieved automatically in chat.
      </p>
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <UploadZone onUpload={handleUpload} isUploading={isUploading} />
      <DocumentTable documents={documents} isLoading={isLoading} onDelete={handleDelete} />
    </div>
  );
}
