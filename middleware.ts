import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // If authenticated, allow access
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

// Define which routes require authentication
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/ips/:path*',
    '/materials/:path*',
    '/workflows/:path*',
    '/tasks/:path*',
    '/videos/:path*',
    '/team/:path*',
    '/api/teams/:path*',
    '/api/ips/:path*',
    '/api/materials/:path*',
    '/api/workflows/:path*',
    '/api/tasks/:path*',
    '/api/videos/:path*',
  ],
}
