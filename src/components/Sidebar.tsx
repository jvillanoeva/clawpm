'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: '⬡ Dashboard', exact: true },
  { href: '/shows', label: '◈ Shows', exact: false },
  { href: '/projects', label: '◈ Projects', exact: false },
  { href: '/tasks', label: '≡ All Tasks', exact: false },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="shrink-0 flex flex-col"
      style={{
        width: '220px',
        backgroundColor: '#0a0a0a',
        borderRight: '1px solid #2a2a2a',
      }}
    >
      {/* Logo area */}
      <div
        style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid #2a2a2a',
          background: 'linear-gradient(180deg, rgba(249,115,22,0.08) 0%, transparent 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px', filter: 'drop-shadow(0 0 6px #f97316)' }}>🦞</span>
          <span
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#f97316',
              letterSpacing: '0.05em',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            ClawPM
          </span>
        </div>
        <div
          style={{
            marginTop: '4px',
            fontSize: '10px',
            color: '#525252',
            fontFamily: 'monospace',
            letterSpacing: '0.08em',
          }}
        >
          OPS TASK MANAGER
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map(({ href, label, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'block',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#f97316' : '#a3a3a3',
                backgroundColor: isActive ? 'rgba(249,115,22,0.1)' : 'transparent',
                borderLeft: isActive ? '2px solid #f97316' : '2px solid transparent',
                textDecoration: 'none',
                letterSpacing: '0.02em',
                transition: 'color 0.15s, background-color 0.15s',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  ;(e.currentTarget as HTMLElement).style.color = '#f5f5f5'
                  ;(e.currentTarget as HTMLElement).style.backgroundColor = '#1a1a1a'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  ;(e.currentTarget as HTMLElement).style.color = '#a3a3a3'
                  ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                }
              }}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid #2a2a2a' }}>
        <div style={{ fontSize: '10px', color: '#525252', fontFamily: 'monospace' }}>
          v0.1.0
        </div>
      </div>
    </aside>
  )
}
