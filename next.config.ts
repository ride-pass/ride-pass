import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 링크를 열면 기사 앱 홈이 먼저 나온다 (2026-11-20). 렌털 신청 화면은 조작판 「시연 단계로 바로 가기 1」로 연다 (CLAUDE.md 3절).
  // next.config의 redirect는 ?demo=1 같은 주소 뒤 값을 그대로 넘긴다.
  async redirects() {
    return [{ source: "/", destination: "/home", permanent: false }];
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
