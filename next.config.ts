import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  serverExternalPackages: ["pdfkit", "fontkit", "svg-to-pdfkit"],
  outputFileTracingIncludes: {
    "/api/export/pdf": ["./node_modules/pdfkit/js/data/**/*"],
  },
};

export default nextConfig;
