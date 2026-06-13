'use client'

import dynamic from 'next/dynamic'

const AdminApp = dynamic(() => import('@/components/AdminApp').then(mod => ({ default: mod.AdminApp })), {
  ssr: false,
})

export default function AdminPage() {
  return <AdminApp />
}