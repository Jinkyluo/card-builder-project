import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdfkit", "fontkit", "svg-to-pdfkit", "better-sqlite3"],
  outputFileTracingIncludes: {
    "/api/export/pdf": ["./node_modules/pdfkit/js/data/**/*"],
  },
};

export default nextConfig;
