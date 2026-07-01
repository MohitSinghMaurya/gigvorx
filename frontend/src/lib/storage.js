const NAMESPACE = "gv_v1";

function userKey(userId, key) {
  return `${NAMESPACE}:${userId || "guest"}:${key}`;
}

function globalKey(key) {
  return `${NAMESPACE}:global:${key}`;
}

export function readList(userId, key) {
  try {
    const raw = localStorage.getItem(userKey(userId, key));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function writeList(userId, key, data) {
  localStorage.setItem(userKey(userId, key), JSON.stringify(data || []));
}

export function readSetting(userId, key, fallback = null) {
  try {
    const raw = localStorage.getItem(userKey(userId, key));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeSetting(userId, key, value) {
  localStorage.setItem(userKey(userId, key), JSON.stringify(value));
}

export function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function readGlobal(key, fallback = null) {
  try {
    const raw = localStorage.getItem(globalKey(key));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeGlobal(key, value) {
  localStorage.setItem(globalKey(key), JSON.stringify(value));
}