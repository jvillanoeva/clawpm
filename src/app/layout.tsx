import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'ClawPM',
  description: 'Ops-grade project and task management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: 'dark', backgroundColor: '#0a0a0a' }}>
      <head>
        <style>{`* { box-sizing: border-box; } body { margin: 0; background-color: #0a0a0a; }`}</style>
      </head>
      <body style={{ margin: 0, backgroundColor: '#0a0a0a', color: '#f5f5f5' }}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto p-6" style={{ backgroundColor: '#0a0a0a' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
