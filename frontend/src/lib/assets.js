const PUBLIC_BASE = (process.env.PUBLIC_URL || "").replace(/\/+$/, "");

export function assetPath(path) {
  if (!path) return "";
  if (/^(https?:\/\/|data:|blob:)/i.test(path)) return path;

  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (PUBLIC_BASE && normalized.startsWith(`${PUBLIC_BASE}/`)) return normalized;

  return `${PUBLIC_BASE}${normalized}`;
}
