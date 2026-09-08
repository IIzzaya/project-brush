import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // GitHub Pages serves this project under https://iizzaya.github.io/project-brush/
  basePath: '/project-brush',
  // NOTE: `output: 'export'` is intentionally NOT set. vinext 1.0.0-beta.5
  // cannot combine basePath with build-time prerendering (the prerenderer
  // requests basePath-less URLs and the RSC handler answers 404). Instead,
  // `scripts/prerender.mjs` boots the built worker and freezes the SSR HTML
  // into dist/client/project-brush/, which the Pages workflow deploys.
};

export default nextConfig;
