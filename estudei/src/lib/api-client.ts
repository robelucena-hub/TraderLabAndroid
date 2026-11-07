import type { FieldErrors } from "@/lib/validation";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; fieldErrors?: FieldErrors };

/**
 * Small fetch wrapper for the app's JSON API. Never throws: network failures
 * and error responses come back as { ok: false, error } with a pt-BR message.
 */
export async function apiFetch<T>(url: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method ?? "GET",
      headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    return { ok: false, status: 0, error: "Sem conexão com o servidor. Verifique sua internet." };
  }

  if (response.status === 204) return { ok: true, data: undefined as T };

  const payload = await response.json().catch(() => null);
  if (response.ok) return { ok: true, data: payload as T };

  if (response.status === 401 && !url.startsWith("/api/auth/")) {
    // Session expired: full navigation to the login page (clears stale client
    // state); this is a plain function, so useRouter() is not available here.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
  }
  return {
    ok: false,
    status: response.status,
    error: payload?.error ?? "Algo deu errado. Tente novamente.",
    fieldErrors: payload?.fieldErrors,
  };
}
