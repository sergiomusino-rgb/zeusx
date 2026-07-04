// This route is intentionally left empty
// Change password requests are handled by the backend at /api/a/:slug/change-password
// The Next.js rewrite rule in next.config.ts will forward these requests to the backend

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  // Return a 404 to let the request fall through to the backend rewrite
  return new Response('Not Found', { status: 404 });
}
