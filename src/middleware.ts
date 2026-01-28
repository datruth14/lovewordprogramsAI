import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/session'

const protectedRoutes = ['/dashboard', '/wallet', '/tasks', '/reports', '/admin']
const publicRoutes = ['/', '/login', '/signup', '/api/auth/login', '/api/auth/signup']

export async function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname
    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
    // We can't verify session *content* deeply in middleware easily without async decrypt, but we can check if cookie exists.
    // Using jose decrypt here is fine.

    const cookie = req.cookies.get('session')?.value
    const session = await decrypt(cookie || '')

    if (isProtectedRoute && !session?.userId) {
        return NextResponse.redirect(new URL('/', req.nextUrl))
    }

    if (path === '/' && session?.userId) {
        return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
