import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 시연은 가상 렌털사 신청 화면에서 시작한다 (CLAUDE.md 3절 1단계).
  // next.config의 redirect는 ?demo=1 같은 주소 뒤 값을 그대로 넘긴다.
  async redirects() {
    return [{ source: "/", destination: "/partner/apply", permanent: false }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
