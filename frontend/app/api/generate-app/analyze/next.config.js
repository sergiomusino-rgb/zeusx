/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/analyze',
        destination: 'https://vigilant-adventure-p7jq5j65p97w3gvw-5005.app.github.dev/api/vision/analyze',
      },
    ];
  },
};
module.exports = nextConfig;