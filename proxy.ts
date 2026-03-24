export { auth as proxy } from '@/auth'

export const config = {
  // Run on all routes except static files, images, and the auth API itself
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)'],
}
