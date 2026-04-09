import { ArtifactCard } from './ArtifactCard';

type Artifact = {
  id: string;
  title: string;
  render_type: string;
  code: string;
  created_at: number;
};

type Props = {
  artifacts: Artifact[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onRerender: (artifact: Artifact) => void;
};

export function ArtifactGrid({ artifacts, isLoading, onDelete, onRerender }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {artifacts.map((artifact) => (
        <ArtifactCard
          key={artifact.id}
          artifact={artifact}
          onDelete={() => onDelete(artifact.id)}
          onRerender={() => onRerender(artifact)}
        />
      ))}
      {artifacts.length === 0 && !isLoading && (
        <div className="col-span-full text-center text-neutral-400 py-12">
          No artifacts saved yet. Chat with VisualMind to generate visual responses.
        </div>
      )}
    </div>
  );
}
