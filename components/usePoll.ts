"use client";

import { useCallback, useEffect, useState } from "react";

/** Fetches JSON now and every `ms` milliseconds. All screens poll our own API (no Supabase keys in the browser). */
export function usePoll<T>(url: string | null, ms = 2000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!url) return;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setData(json as T);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [url]);

  useEffect(() => {
    if (!url) return;
    const first = setTimeout(load, 0);
    const timer = setInterval(load, ms);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load, ms, url]);

  return { data, error, reload: load };
}

/** POSTs JSON (or FormData) and returns the parsed answer; throws with the server's error message. */
export async function post<T = unknown>(url: string, body?: unknown): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(url, {
    method: "POST",
    headers: isForm ? undefined : { "content-type": "application/json" },
    body: isForm ? (body as FormData) : JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json && typeof json === "object" && "error" in json && json.error)) {
    throw new Error((json as { error?: string }).error || res.statusText);
  }
  return json as T;
}
