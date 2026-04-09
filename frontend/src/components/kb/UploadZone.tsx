import { useCallback, useState } from 'react';

type Props = {
  onUpload: (file: File) => void;
  isUploading: boolean;
};

export function UploadZone({ onUpload, isUploading }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  }, [onUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  }, [onUpload]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-neutral-300 hover:border-neutral-400'
      } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <input type="file" onChange={handleFileSelect} className="hidden" id="file-upload" accept=".pdf,.txt,.md,.doc,.docx" />
      <label htmlFor="file-upload" className="cursor-pointer">
        <p className="text-lg font-medium text-neutral-700">{isUploading ? 'Processing...' : 'Drag & drop or click to upload'}</p>
        <p className="text-sm text-neutral-400 mt-1">PDF, TXT, MD, DOC</p>
      </label>
    </div>
  );
}
