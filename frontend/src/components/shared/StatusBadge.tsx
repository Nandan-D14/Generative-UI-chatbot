type Props = {
  status: 'idle' | 'streaming' | 'indexed' | 'error';
  label?: string;
};

export function StatusBadge({ status, label }: Props) {
  const colors = {
    idle: 'bg-neutral-200 text-neutral-600',
    streaming: 'bg-blue-100 text-blue-700 animate-pulse',
    indexed: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      {label || status}
    </span>
  );
}
