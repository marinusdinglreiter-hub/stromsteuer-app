/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@stromsteuer/ui", "@stromsteuer/db"],
};

export default nextConfig;
