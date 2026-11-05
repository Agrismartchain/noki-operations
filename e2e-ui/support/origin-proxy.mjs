// Test-only reverse proxy. The Operations BFF refuses every auth POST unless Origin equals NOKI_PUBLIC_ORIGIN (an https
// origin, fail-closed in production). The UI e2e stack runs over plain http on localhost, so this proxy forwards to the
// real Next.js server and presents the configured public origin on the Origin/Referer headers. The application and its
// CSRF guard are NOT modified or bypassed: the guard still compares the header with NOKI_PUBLIC_ORIGIN.
import { createServer, request as httpRequest } from "node:http";

const [frontPort, backPort, publicOrigin = "https://operations.test"] = [process.argv[2], process.argv[3], process.argv[4]];

createServer((req, res) => {
  const headers = { ...req.headers };
  // Only the BFF auth routes (their CSRF guard compares Origin with NOKI_PUBLIC_ORIGIN) get the public origin. Everything
  // else, notably Next.js Server Actions (whose own origin check compares Origin with the Host), is forwarded untouched.
  if (req.url?.startsWith("/api/auth/")) {
    if (headers.origin) headers.origin = publicOrigin;
    if (headers.referer) headers.referer = `${publicOrigin}${new URL(headers.referer, "http://x").pathname}`;
  }
  const upstream = httpRequest({ host: "127.0.0.1", port: Number(backPort), method: req.method, path: req.url, headers }, (up) => {
    res.writeHead(up.statusCode ?? 502, up.headers);
    up.pipe(res);
  });
  upstream.on("error", () => { res.writeHead(502); res.end("upstream error"); });
  req.pipe(upstream);
}).listen(Number(frontPort), "127.0.0.1");
