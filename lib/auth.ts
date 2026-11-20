/** Agent tool calls and admin routes must send the shared secret (header `x-agent-secret` or `?secret=`). */
export function hasSecret(req: Request): boolean {
  const secret = process.env.AGENT_TOOL_SECRET;
  if (!secret) return true; // no secret configured: open (local dev only)
  const got = req.headers.get("x-agent-secret") ?? new URL(req.url).searchParams.get("secret");
  return got === secret;
}

export function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

/** Wraps a JSON route: parses the body, returns { error } with status 500 on failure. */
export async function jsonRoute<T>(req: Request, fn: (body: T) => Promise<unknown>) {
  try {
    const body = (await req.json().catch(() => ({}))) as T;
    return Response.json(await fn(body));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(message);
    return Response.json({ error: message }, { status: 500 });
  }
}

/** Wraps any route body: returns its result as JSON, or { error } with status 500. */
export async function handle(fn: () => Promise<unknown>) {
  try {
    return Response.json(await fn());
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(message);
    return Response.json({ error: message }, { status: 500 });
  }
}
