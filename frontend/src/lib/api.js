import axios from "axios";

const CONFIGURED_API_BASE = process.env.REACT_APP_API_BASE || "";
export const API_BASE = (CONFIGURED_API_BASE || "/api/game").replace(/\/+$/, "");
const GAME_TOKEN_KEY = "andeor_game_access_token";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export function getGameAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(GAME_TOKEN_KEY);
}

export function setGameAccessToken(token) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(GAME_TOKEN_KEY, token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    window.localStorage.removeItem(GAME_TOKEN_KEY);
    delete api.defaults.headers.common.Authorization;
  }
}

api.interceptors.request.use((config) => {
  const token = getGameAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function linkMainSiteAccount() {
  if (typeof window === "undefined") return null;
  try {
    const response = await fetch("/api/andeor-game/session", {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.authenticated || !data?.token || !data?.user) return null;
    setGameAccessToken(data.token);
    return data.user;
  } catch {
    return null;
  }
}

export function formatErr(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
