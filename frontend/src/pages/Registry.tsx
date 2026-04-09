import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ComponentRegistry } from '../components/registry/ComponentRegistry';
import { useRegistry } from '../hooks/useRegistry';

export function RegistryPage() {
  const { getToken } = useAuth();
  const { components, isLoading, fetchComponents, deleteComponent } = useRegistry();

  useEffect(() => {
    getToken().then(token => token && fetchComponents(token));
  }, []);

  const handleDelete = async (name: string) => {
    const token = await getToken();
    if (token) deleteComponent(name, token);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Component Registry</h1>
      <ComponentRegistry components={components} isLoading={isLoading} onDelete={handleDelete} onTest={() => {}} />
    </div>
  );
}
