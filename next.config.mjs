/** Static export so the studio can be hosted anywhere (Vercel, Netlify, S3, GitHub Pages).
 *  Set STATIC_RELATIVE=1 to emit relative asset paths for hosting inside a sub-folder. */
const rel = process.env.STATIC_RELATIVE === '1';
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: false,
  ...(rel ? { assetPrefix: '.' } : {}),
  typescript: { ignoreBuildErrors: false },
};
export default nextConfig;
