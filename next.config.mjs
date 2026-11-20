/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['three'],
  experimental: {
    // lib/ai-build/materialize.ts reads starter-kit/ from disk at request time
    // (fs.readdir on a computed path, which file tracing can't follow), so the
    // route that starts a build must ship with the kit's sources.
    outputFileTracingIncludes: {
      '/commit/[id]/ai-build/architecture': ['./starter-kit/**/*'],
    },
    outputFileTracingExcludes: {
      '/commit/[id]/ai-build/architecture': ['./starter-kit/node_modules/**', './starter-kit/.next/**'],
    },
  },
};

export default nextConfig;
