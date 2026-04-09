import { VisualPanel } from '../chat/VisualPanel';

type Artifact = {
  id: string;
  title: string;
  render_type: string;
  code: string;
  created_at: number;
};

type Props = {
  artifact: Artifact;
  onDelete: () => void;
  onRerender: () => void;
};

export function ArtifactCard({ artifact, onDelete, onRerender }: Props) {
  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
        <h3 className="font-medium text-sm truncate">{artifact.title}</h3>
        <div className="flex gap-2">
          <button onClick={onRerender} className="text-xs text-blue-600 hover:text-blue-800">Re-render</button>
          <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">Delete</button>
        </div>
      </div>
      <VisualPanel code={artifact.code} renderType={artifact.render_type as 'html' | 'react'} />
    </div>
  );
}
