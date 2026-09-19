const CLIENT_ID_KEY = "present-client-id";
const SESSION_KEY = "present-session";

function clientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

function baseHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Present-Client-Id": clientId(),
  };
}

function authHeaders(): HeadersInit {
  const session = localStorage.getItem(SESSION_KEY);
  return {
    ...baseHeaders(),
    ...(session ? { "X-Present-Session": session } : {}),
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || "request failed"), { body, status: res.status });
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type Tag = { id: string; name: string; deleted: boolean };
export type RecordItem = {
  id: string;
  description: string;
  momentAt: string;
  version: number;
  deleted: boolean;
  tags: Tag[];
};

export const api = {
  saveSession(token: string) {
    localStorage.setItem(SESSION_KEY, token);
  },
  clearSession() {
    localStorage.removeItem(SESSION_KEY);
  },
  hasSession() {
    return !!localStorage.getItem(SESSION_KEY);
  },
  async status() {
    return request<{ blocked: boolean; triesRemaining: number; sessionValid: boolean }>("/api/status", {
      headers: authHeaders(),
    });
  },
  async unlock(key: string) {
    const data = await request<{ sessionToken: string }>("/api/unlock", {
      method: "POST",
      headers: { ...baseHeaders(), "X-Present-Key": key },
      body: JSON.stringify({ key }),
    });
    api.saveSession(data.sessionToken);
    return data;
  },
  async listTags() {
    return request<Tag[]>("/api/tags", { headers: authHeaders() });
  },
  async createTag(name: string) {
    return request<Tag>("/api/tags", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name }),
    });
  },
  async renameTag(id: string, name: string) {
    return request<Tag>(`/api/tags/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ name }),
    });
  },
  async deleteTag(id: string) {
    return request<void>(`/api/tags/${id}`, { method: "DELETE", headers: authHeaders() });
  },
  async listRecords(params: { tagId?: string; from?: string; to?: string } = {}) {
    const q = new URLSearchParams();
    if (params.tagId) q.set("tagId", params.tagId);
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    const suffix = q.toString() ? `?${q}` : "";
    return request<RecordItem[]>(`/api/records${suffix}`, { headers: authHeaders() });
  },
  async createRecord(input: { description: string; momentAt?: string; tagIds: string[] }) {
    return request<RecordItem>("/api/records", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(input),
    });
  },
  async updateRecord(id: string, input: { description: string; momentAt: string; tagIds: string[]; version: number }) {
    return request<RecordItem>(`/api/records/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(input),
    });
  },
  async deleteRecord(id: string) {
    return request<void>(`/api/records/${id}`, { method: "DELETE", headers: authHeaders() });
  },
};
