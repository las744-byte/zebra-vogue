import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  
  if (password === process.env.ADMIN_PASSWORD) {
    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  }
  
  return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
}