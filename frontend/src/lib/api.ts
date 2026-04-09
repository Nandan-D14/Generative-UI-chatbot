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
