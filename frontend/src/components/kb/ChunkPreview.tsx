type Props = {
  chunks: string[];
};

export function ChunkPreview({ chunks }: Props) {
  return (
    <div className="mt-4 max-h-64 overflow-y-auto">
      {chunks.map((chunk, i) => (
        <div key={i} className="mb-2 p-3 bg-neutral-50 rounded-lg text-xs text-neutral-600">
          <span className="font-medium text-neutral-400">Chunk {i + 1}</span>
          <p className="mt-1">{chunk.slice(0, 200)}...</p>
        </div>
      ))}
    </div>
  );
}
