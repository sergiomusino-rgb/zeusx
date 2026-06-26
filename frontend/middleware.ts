import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [],
};

export async function middleware(request: NextRequest) {
  return NextResponse.next();
}
