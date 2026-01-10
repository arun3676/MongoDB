'use client'

import type { Metadata } from 'next'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Home, FileText, BarChart3, ChevronLeft, ChevronRight, Shield } from 'lucide-react'
import './globals.css'

// Navigation items for Mission Control
const navItems = [
  {
    label: 'Create Case',
    href: '/',
    icon: Home,
  },
]

function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', String(newState))
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-screen glass-sidebar z-50 flex flex-col transition-all duration-200 ${
        isCollapsed ? 'w-[64px]' : 'w-[260px]'
      }`}
    >
      {/* Logo / Brand */}
      <div className={`py-6 border-b border-border ${isCollapsed ? 'px-3' : 'px-6'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 rounded-lg bg-mint/10 border border-mint/30 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-mint" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-semibold text-text-primary tracking-tight">Fraud Guardian</h1>
              <p className="text-xs text-text-muted">Mission Control</p>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleCollapsed}
        className="absolute top-6 -right-3 w-6 h-6 rounded-full bg-carbon border border-border hover:border-mint flex items-center justify-center transition-all duration-200 hover:bg-surface-light"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-text-muted hover:text-mint" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-text-muted hover:text-mint" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-light transition-all duration-200 group ${
                  isCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2.5'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 text-text-muted group-hover:text-mint transition-colors shrink-0" />
                {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </div>

        {/* Status Section - Hidden when collapsed */}
        {!isCollapsed && (
          <div className="mt-8 pt-6 border-t border-border">
            <p className="px-3 text-xs font-medium text-text-muted uppercase tracking-wider mb-3">System Status</p>
            <div className="px-3 py-3 rounded-lg bg-surface/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="status-dot status-dot-success"></span>
                <span className="text-sm text-text-secondary">All Systems Operational</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="font-mono">API: 99.9%</span>
                <span className="font-mono">DB: Active</span>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Branding Section */}
      <div className="px-4 py-3 border-t border-border">
        {!isCollapsed ? (
          <div className="space-y-2 text-xs text-text-muted">
            <div className="flex items-center gap-2">
              <span className="text-orange-500">🔥</span>
              <span>Fireworks AI</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#00ED64">
                <path d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.115-.28-.394-.53-.954-.735-1.44-.036.495-.055.685-.523 1.184-.723.566-4.438 3.682-4.74 10.02-.282 5.912 4.27 9.435 4.888 9.884l.07.05A73.49 73.49 0 0111.91 24h.481c.114-1.032.284-2.056.51-3.07.417-.296 4.488-3.29 4.293-11.375z"/>
              </svg>
              <span>MongoDB</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-orange-500 text-lg">🔥</span>
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="#00ED64">
              <path d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.115-.28-.394-.53-.954-.735-1.44-.036.495-.055.685-.523 1.184-.723.566-4.438 3.682-4.74 10.02-.282 5.912 4.27 9.435 4.888 9.884l.07.05A73.49 73.49 0 0111.91 24h.481c.114-1.032.284-2.056.51-3.07.417-.296 4.488-3.29 4.293-11.375z"/>
            </svg>
          </div>
        )}
      </div>

      {/* User Section */}
      <div className={`px-4 py-4 border-t border-border ${isCollapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? '' : 'gap-3 px-2'}`}>
          <div className="w-9 h-9 rounded-full bg-carbon-50 border border-border flex items-center justify-center shrink-0">
            <span className="text-sm font-medium text-text-secondary">A</span>
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">Admin</p>
                <p className="text-xs text-text-muted truncate">admin@fraudguard.io</p>
              </div>
              <button className="p-1.5 rounded-md hover:bg-surface-light transition-colors">
                <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(260)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    setSidebarWidth(saved === 'true' ? 64 : 260)

    // Listen for storage changes from the sidebar
    const handleStorage = () => {
      const saved = localStorage.getItem('sidebar-collapsed')
      setSidebarWidth(saved === 'true' ? 64 : 260)
    }

    window.addEventListener('storage', handleStorage)

    // Also listen for changes within the same window
    const interval = setInterval(() => {
      const saved = localStorage.getItem('sidebar-collapsed')
      const newWidth = saved === 'true' ? 64 : 260
      if (newWidth !== sidebarWidth) {
        setSidebarWidth(newWidth)
      }
    }, 100)

    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [sidebarWidth])

  return (
    <main
      className="min-h-screen bg-grid-subtle transition-all duration-200"
      style={{ marginLeft: `${sidebarWidth}px` }}
    >
      {/* Top ambient glow effect */}
      <div
        className="fixed top-0 right-0 h-[300px] bg-glow-mint pointer-events-none opacity-30 z-0 transition-all duration-200"
        style={{ left: `${sidebarWidth}px` }}
      />

      {/* Content container */}
      <div className="relative z-10 p-8">
        {children}
      </div>
    </main>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-carbon min-h-screen">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <RootLayoutContent>{children}</RootLayoutContent>
      </body>
    </html>
  )
}
