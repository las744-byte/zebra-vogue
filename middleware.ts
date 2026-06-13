import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Пропускаємо сторінку логіна і API логіна
  if (
    request.nextUrl.pathname === '/admin/login' ||
    request.nextUrl.pathname === '/api/admin-login'
  ) {
    return NextResponse.next()
  }

  // Захищаємо інші сторінки /admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const authCookie = request.cookies.get('admin_auth')
    
    if (authCookie?.value !== 'true') {
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}