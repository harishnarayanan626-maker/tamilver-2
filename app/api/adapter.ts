/**
 * Next.js 14 App Router Adapter for Sorkalam
 * Bridges standard NextRequest / NextResponse to our unified handlers.
 */

import { handleApiRequest } from "@/../server/handlers";

export async function forwardToSorkalamHandler(req: Request, params?: Record<string, string>) {
  const url = new URL(req.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((val, key) => {
    query[key] = val;
  });

  if (params) {
    Object.assign(query, params);
  }

  let body: any = undefined;
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    try {
      body = await req.json();
    } catch {
      body = undefined;
    }
  }

  const headers: Record<string, string | undefined> = {};
  req.headers.forEach((v, k) => {
    headers[k] = v;
  });

  const response = await handleApiRequest({
    method: req.method,
    path: url.pathname,
    query,
    body,
    headers,
  });

  const resHeaders = new Headers(response.headers || {});
  if (!resHeaders.has("Content-Type")) {
    resHeaders.set("Content-Type", "application/json");
  }

  const resBody = typeof response.body === "string" ? response.body : JSON.stringify(response.body);

  return new Response(resBody, {
    status: response.status,
    headers: resHeaders,
  });
}
