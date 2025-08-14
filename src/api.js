// src/api.js
export const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function authHeaders(extra = {}) {
  const t = localStorage.getItem("token");
  return { Authorization: `Bearer ${t}`, ...extra };
}

export async function apiGet(path) {
  const r = await fetch(`${API}${path}`, { headers: authHeaders() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function apiPost(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
