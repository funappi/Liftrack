// Safe localStorage helpers: storage can be unavailable or hold invalid JSON
export const loadJSON = <T>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return fallback;
};

export const saveJSON = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};
