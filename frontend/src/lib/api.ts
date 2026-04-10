const API_BASE = '';

export async function apiFetch(path: string, token: string, options?: RequestInit) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      'Authorization': `Bearer ${token}`
    }
  });
}

export async function deleteChat(chatId: string, token: string) {
  const res = await apiFetch(`/api/chat/${chatId}`, token, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete chat');
  return res.json();
}
