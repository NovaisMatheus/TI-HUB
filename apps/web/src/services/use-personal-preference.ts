import { useState } from 'react';
export function usePersonalPreference(userId: string, preference: string, initial: boolean) {
  const key = `hub:${userId}:${preference}`;
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? initial : saved === 'true';
    } catch {
      return initial;
    }
  });
  function update(next: boolean | ((previous: boolean) => boolean)) {
    setValue((previous) => {
      const result = typeof next === 'function' ? next(previous) : next;
      try {
        localStorage.setItem(key, String(result));
      } catch {
        /* Keep the preference for this session if storage is unavailable. */
      }
      return result;
    });
  }
  return [value, update] as const;
}
