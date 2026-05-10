import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
const TOKEN_KEY = "hakka_admin_token";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      clearToken();
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ───── Endpoint helpers ─────
export async function adminLogin(googleIdToken: string) {
  const { data } = await api.post("/admin/auth/login", { google_id_token: googleIdToken });
  return data as { admin_token: string; email: string; expires_in_hours: number };
}
export async function adminMe() {
  const { data } = await api.get("/admin/auth/me");
  return data as { email: string };
}
export async function adminLogout() {
  await api.post("/admin/auth/logout");
}

export type Period = "7d" | "30d" | "90d" | "1y";

export async function getStats(period: Period) {
  const { data } = await api.get("/admin/stats", { params: { period } });
  return data;
}
export async function getPopularLinks(params: {
  period: Period;
  mokkoji_id?: number;
  age_range?: string;
  category?: string;
  tag?: string;
  limit?: number;
}) {
  const { data } = await api.get("/admin/links", { params });
  return data;
}
export async function listMokkojis() {
  const { data } = await api.get("/admin/mokkojis");
  return data as { mokkojis: { id: number; name: string; guid: string }[] };
}
export async function getMokkojiDetail(id: number, period: Period) {
  const { data } = await api.get(`/admin/mokkojis/${id}`, { params: { period } });
  return data;
}

// Raw 데이터 (포폴 narrative 출처)
export async function getRawOnboarding(period: Period) {
  const { data } = await api.get("/admin/raw/onboarding", { params: { period } });
  return data;
}
export async function getRawSearch(period: Period) {
  const { data } = await api.get("/admin/raw/search", { params: { period } });
  return data;
}
export async function getRawShare(period: Period) {
  const { data } = await api.get("/admin/raw/share", { params: { period } });
  return data;
}
export async function getRawActivity(period: Period) {
  const { data } = await api.get("/admin/raw/activity", { params: { period } });
  return data;
}
export async function getRawActions(period: Period) {
  const { data } = await api.get("/admin/raw/actions", { params: { period } });
  return data;
}
