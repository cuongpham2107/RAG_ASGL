import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth-storage')?.value
  const pathname = request.nextUrl.pathname

  if (authToken) {
    try {
      const decoded = jwt.decode(authToken)
      const currentTime = Math.floor(Date.now() / 1000)

      if (typeof decoded !== 'string' && decoded?.exp && decoded.exp < currentTime) {
        const response = NextResponse.redirect(new URL('/auth/login', request.url))
        response.cookies.delete('auth-storage')
        return response
      }
    } catch (err) {
      console.error('Token error:', err)
      const response = NextResponse.redirect(new URL('/auth/login', request.url))
      response.cookies.delete('auth-storage')
      return response
    }
  }

  if (!authToken && !pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return NextResponse.next()
}


export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
}