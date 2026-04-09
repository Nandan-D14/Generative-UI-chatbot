import { useState, useCallback } from 'react';

export function useRegistry() {
  const [components, setComponents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchComponents = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/registry', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setComponents(await res.json());
    } catch (err) {
      console.error('Failed to fetch components:', err);
    }
    setIsLoading(false);
  }, []);

  const saveComponent = useCallback(async (data: any, token: string) => {
    await fetch('/api/chat/save-component', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
  }, []);

  const deleteComponent = useCallback(async (name: string, token: string) => {
    await fetch(`/api/registry/${name}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }, []);

  return { components, isLoading, fetchComponents, saveComponent, deleteComponent };
}
