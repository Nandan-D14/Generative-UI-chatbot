type Document = {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'processing' | 'indexed' | 'failed';
  chunk_count: number;
  error_message: string | null;
  created_at: number;
};

type Props = {
  documents: Document[];
  isLoading: boolean;
  onDelete: (id: string) => void;
};

export function DocumentTable({ documents, isLoading, onDelete }: Props) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'indexed': return 'text-green-600';
      case 'processing': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-neutral-600';
    }
  };

  return (
    <div className="mt-6">
      {isLoading ? (
        <p className="text-center text-neutral-400 py-8">Loading...</p>
      ) : documents.length === 0 ? (
        <p className="text-center text-neutral-400 py-8">No documents uploaded yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200">
            <tr>
              <th className="text-left py-3 px-4 text-neutral-500 font-medium">Name</th>
              <th className="text-left py-3 px-4 text-neutral-500 font-medium">Size</th>
              <th className="text-left py-3 px-4 text-neutral-500 font-medium">Chunks</th>
              <th className="text-left py-3 px-4 text-neutral-500 font-medium">Status</th>
              <th className="text-left py-3 px-4 text-neutral-500 font-medium">Uploaded</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b border-neutral-100 hover:bg-neutral-50 align-top">
                <td className="py-3 px-4 font-medium">{doc.name}</td>
                <td className="py-3 px-4 text-neutral-500">{formatSize(doc.size)}</td>
                <td className="py-3 px-4 text-neutral-500">{doc.chunk_count}</td>
                <td className="py-3 px-4">
                  <p className={`capitalize ${statusColor(doc.status)}`}>{doc.status}</p>
                  {doc.error_message ? (
                    <p className="mt-1 max-w-xs text-xs text-red-500">{doc.error_message}</p>
                  ) : null}
                </td>
                <td className="py-3 px-4 text-neutral-500">{new Date(doc.created_at).toLocaleDateString()}</td>
                <td className="py-3 px-4">
                  <button onClick={() => onDelete(doc.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
