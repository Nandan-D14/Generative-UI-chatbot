import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ArtifactGrid } from '../components/artifacts/ArtifactGrid';

export function ArtifactsPage() {
  const { getToken } = useAuth();
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { loadArtifacts(); }, []);

  const loadArtifacts = async () => {
    const token = await getToken();
    if (!token) return;
    setIsLoading(true);
    const res = await fetch('/api/artifacts', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setArtifacts(await res.json());
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    const token = await getToken();
    await fetch(`/api/artifacts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadArtifacts();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Artifacts</h1>
      <ArtifactGrid artifacts={artifacts} isLoading={isLoading} onDelete={handleDelete} onRerender={() => {}} />
    </div>
  );
}
