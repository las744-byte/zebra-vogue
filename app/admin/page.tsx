'use client'

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'

const AdminApp = dynamic<ComponentType>(
  () => import('@/components/AdminApp').then(mod => ({ default: mod.AdminApp })),
  { ssr: false }
)

export default function AdminPage() {
  return <AdminApp />
}