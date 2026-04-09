import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { UploadZone } from '../components/kb/UploadZone';
import { DocumentTable } from '../components/kb/DocumentTable';
import { useKnowledgeBase } from '../hooks/useKnowledgeBase';

export function KnowledgeBasePage() {
  const { getToken } = useAuth();
  const { documents, isUploading, isLoading, fetchDocuments, uploadDocument, deleteDocument } = useKnowledgeBase();

  useEffect(() => {
    getToken().then(token => token && fetchDocuments(token));
  }, []);

  const handleUpload = async (file: File) => {
    const token = await getToken();
    if (token) uploadDocument(file, token);
  };

  const handleDelete = async (id: string) => {
    const token = await getToken();
    if (token) deleteDocument(id, token);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Knowledge Base</h1>
      <UploadZone onUpload={handleUpload} isUploading={isUploading} />
      <DocumentTable documents={documents} isLoading={isLoading} onDelete={handleDelete} />
    </div>
  );
}
