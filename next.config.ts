import type { NextConfig } from "next";

const isStandalone = process.env.NEXT_OUTPUT === "standalone";

const nextConfig: NextConfig = {
  output: isStandalone ? "standalone" : undefined,
  ...(isStandalone && {
    outputFileTracingIncludes: {
      "/**": ["./prisma/**/*"],
    },
  }),
};

export default nextConfig;
