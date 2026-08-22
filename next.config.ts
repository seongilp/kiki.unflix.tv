import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // ebs 홈서버(Node standalone) 배포용. Workers 배포(opennextjs-cloudflare build)에는 영향 없음.
  output: "standalone",
  // 홈 디렉터리의 락파일 때문에 트레이싱 루트가 ~ 로 잡혀 standalone 이 중첩되는 것 방지
  outputFileTracingRoot: import.meta.dirname,
  images: {
    // Workers runs no Node image optimizer; serve YouTube images unoptimized.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**.ggpht.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "**.ytimg.com" },
    ],
  },
};

export default nextConfig;

// Expose Cloudflare bindings (KV, etc.) to `next dev` via getCloudflareContext().
// (Node standalone 프로덕션 빌드에서는 wrangler 를 띄울 필요가 없어 dev 로 한정)
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}
