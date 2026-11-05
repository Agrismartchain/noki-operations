# Trivy exceptions — noki-operations runtime image

Policy: the `Container Image` workflow scans the image with Trivy (`severity: CRITICAL,HIGH`, `exit-code: 1`). Exceptions live
only in `.trivyignore`, one CVE per line, **each with an expiry**; there is no global `ignore-unfixed`, the scan is never
disabled, and the base image is not downgraded. Same treatment as `noki-admin` (PR #6), re-analysed for this image.

## CVE-2026-76844 — `zlib1g` (Debian 13 / distroless `nodejs24-debian13:nonroot`)
- **Status:** excepted until **2026-11-19** (`exp:2026-11-19`). After that date the scan blocks again by itself.
- **Finding (Container Image run 42037999486, commit `ddd95e4`):** `zlib1g 1:1.3.dfsg+really1.3.1-1+b1`, HIGH, *affected*, no
  fixed version; it was the **only** finding (0 CRITICAL, 0 other HIGH). Debian tracker: trixie and forky vulnerable, fixed only in
  sid (`1:1.3.dfsg+really1.3.2-4`, upstream commit `df84af25`).
- **Vulnerability:** `gz_write()` leaves `strm.next_in` pointing at the caller's buffer after a failed `write()`; a later `gz*` write
  on the same `gzFile` writes past a heap allocation. It needs (1) a program writing through the zlib *gz file API* (`gzwrite`,
  `gzfwrite`, `gzputs`, `gzprintf`, `gzputc`…) and (2) a failing `write()` on that descriptor.

### Reachability review specific to Operations
Runtime stage (`Dockerfile`): `gcr.io/distroless/nodejs24-debian13:nonroot@sha256:b8cec4b2…`, `USER 1001:1001`, `CMD ["server.js"]`,
healthcheck through `node` (`fetch('/api/health')`).

| Question | Evidence | Result |
|---|---|---|
| Is this the base image that was analysed? | the digest pinned here (`b8cec4b2f2126ff7bd034ec9ac207ffb3272667dfdc48376e3b035d3270549ba`) is the manifest-index digest of the image whose layers were inspected for `noki-admin` | identical base |
| Which executables exist? | only `/nodejs/bin/node` (no shell, no other ELF executable) | one process type |
| Does `node` load the OS `libz.so.1`? | `readelf -d`: NEEDED = libdl, libstdc++, libm, libgcc_s, libpthread, libc, ld-linux — **no libz, libcrypto, libssl** | **not linked** |
| What zlib / OpenSSL does node use? | statically bundled zlib 1.3.2.1 and OpenSSL 3.5.9 (separate copies, not the Debian package) | not the flagged package |
| Does `node` call the gz write API? | 0 direct callers of its own `gzwrite/gzfwrite/gzputs/gzprintf/gzputc` | not used |
| Who links the OS `libz.so.1`? | only OS `libcrypto.so.3`, which imports `deflate/inflate/compress/uncompress` and **no `gz*` symbol**, and which nothing loads | write API absent |
| Native addons in **this** app? | standalone `@img/sharp-*` and `libvips-cpp.so`: NEEDED are libc/libstdc++/libm/libgcc/libpthread/libresolv/libdl only (zlib statically inside libvips) | do not use the OS libz |
| Application code? | no `zlib`/`gzip` API in `src/` (checked); Next.js uses Node's `zlib` stream API (bundled copy) | no gz file writes |

### Decision
**Acceptable, time-boxed.** No reachable path to the vulnerable function was identified: the only vulnerable component is an OS
library that the runtime process never loads, and the vulnerable API has no caller. This is a *no path identified* conclusion, not
a proof of zero risk (a future native addon or a base-image change could load the library), hence the expiry.

### Limits / follow-ups
- The zlib bundled inside Node is a different component and is **not** covered by this exception.
- Re-evaluate on 2026-11-19 at the latest, or as soon as a distroless image with the fixed zlib is published, then delete the entry.
- Any other CRITICAL/HIGH finding keeps failing the build.

## Runtime smoke test (publication pipeline)
`Container Image` now runs the freshly built image before pushing it: container started with `NODE_ENV=production`,
`NOKI_API_BASE_URL` (https, validated by the app) and `NOKI_PUBLIC_ORIGIN` (exact https origin), then `/api/health` = HTTP 200,
Docker health state `healthy`, non-root user, restart count 0, no HTTP 500/fatal in the logs, clean stop on SIGTERM.
