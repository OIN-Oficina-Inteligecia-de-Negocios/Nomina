const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = sessionStorage.getItem('lia_token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem('lia_token');
      sessionStorage.removeItem('lia_user');
    }
    throw new ApiError(
      data.error ?? 'No fue posible completar la solicitud',
      response.status,
      data.code,
    );
  }
  return data;
}

export async function apiBlob(
  path: string,
  options: RequestInit = {},
): Promise<Blob> {
  const token = sessionStorage.getItem('lia_token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      sessionStorage.removeItem('lia_token');
      sessionStorage.removeItem('lia_user');
    }
    throw new ApiError(
      data.error ?? 'No fue posible descargar el documento',
      response.status,
      data.code,
    );
  }
  return response.blob();
}