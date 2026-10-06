import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { buildSecurityHeaders } from "./src/lib/security/headers";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders({ imgSrc: ["https:"] }),
      },
    ];
  },
};

export default withNextIntl(nextConfig);
