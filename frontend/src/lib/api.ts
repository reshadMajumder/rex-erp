export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function refreshAccessToken() {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) {
    logout();
    throw new Error("No refresh token");
  }

  const res = await fetch(`${API_URL}/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    logout();
    throw new Error("Session expired");
  }

  const data = await res.json();
  localStorage.setItem("access_token", data.access);
  return data.access;
}

function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;
  let headers = { ...getAuthHeaders(), ...options.headers };

  let response = await fetch(fullUrl, { ...options, headers });

  if (response.status === 401 && localStorage.getItem("refresh_token")) {
    try {
      const newToken = await refreshAccessToken();
      headers = { ...headers, Authorization: `Bearer ${newToken}` };
      response = await fetch(fullUrl, { ...options, headers });
    } catch (err) {
      logout();
    }
  }

  if (response.status === 401 || response.status === 403) {
    const data = await response.json().catch(() => ({}));
    if (data.code === "token_not_valid" || data.detail?.includes("not found")) {
      logout();
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || "An API error occurred");
  }

  return response;
}

export const api = {
  get: async <T,>(url: string): Promise<T> => {
    const res = await fetchWithAuth(url);
    if (res.status === 204) return {} as T;
    return res.json();
  },
  post: async <T,>(url: string, body?: any): Promise<T> => {
    const res = await fetchWithAuth(url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (res.status === 204) return {} as T;
    return res.json();
  },
  patch: async <T,>(url: string, body: any): Promise<T> => {
    const res = await fetchWithAuth(url, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (res.status === 204) return {} as T;
    return res.json();
  },
  delete: async <T,>(url: string): Promise<T> => {
    const res = await fetchWithAuth(url, { method: "DELETE" });
    if (res.status === 204) return {} as T;
    try {
      return await res.json();
    } catch {
      return {} as T;
    }
  },
};
