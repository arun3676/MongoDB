'use client'

import type { Metadata } from 'next'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Home, FileText, BarChart3, ChevronLeft, ChevronRight, Shield, ShoppingCart } from 'lucide-react'
import './globals.css'

// Navigation items for Mission Control
const navItems = [
  {
    label: 'Mission Dashboard',
    href: '/',
    icon: Home,
  },
  {
    label: 'Audit Ledger',
    href: '/cases',
    icon: FileText,
  },
  {
    label: 'Nexus Market',
    href: '/marketplace',
    icon: ShoppingCart,
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
      className={`fixed left-0 top-0 h-screen bg-white z-50 flex flex-col transition-all duration-300 border-r border-gray-100 ${isCollapsed ? 'w-[80px]' : 'w-[280px]'
        }`}
    >
      {/* Logo / Brand */}
      <div className={`py-8 ${isCollapsed ? 'px-4' : 'px-8'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'}`}>
          <div className="w-12 h-12 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/20 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none mb-1 uppercase">Nexus Guard</h1>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] opacity-80">v2.402 Protocol</p>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleCollapsed}
        className="absolute top-10 -right-3.5 w-7 h-7 rounded-full bg-white border border-gray-100 shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group z-50"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 transition-colors" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 transition-colors" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 overflow-y-auto">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-2xl transition-all duration-300 group ${isCollapsed ? 'justify-center p-3.5' : 'gap-4 px-5 py-4'
                  } hover:bg-blue-50/50 hover:text-blue-600 text-gray-500 font-bold`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 transition-colors shrink-0 group-hover:text-blue-600 ${isCollapsed ? '' : 'opacity-70'}`} />
                {!isCollapsed && <span className="text-sm uppercase tracking-widest leading-none">{item.label}</span>}
              </Link>
            )
          })}
        </div>

        {/* Status Section - Hidden when collapsed */}
        {!isCollapsed && (
          <div className="mt-12 pt-8 border-t border-gray-50 px-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">System Integrity</p>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  <span className="text-xs font-bold text-gray-600">Agents Operational</span>
                </div>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">Live</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                  <span className="text-xs font-bold text-gray-600">Database Cluster</span>
                </div>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">Active</span>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Branding Section */}
      <div className={`px-8 py-8 border-t border-gray-50 ${isCollapsed ? 'flex flex-col items-center gap-6' : ''}`}>
        {!isCollapsed ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-crosshair">
              <span className="text-lg">🔥</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Fireworks Engine</span>
            </div>
            <div className="flex items-center gap-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-crosshair">
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="#00ED64">
                <path d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.115-.28-.394-.53-.954-.735-1.44-.036.495-.055.685-.523 1.184-.723.566-4.438 3.682-4.74 10.02-.282 5.912 4.27 9.435 4.888 9.884l.07.05A73.49 73.49 0 0111.91 24h.481c.114-1.032.284-2.056.51-3.07.417-.296 4.488-3.29 4.293-11.375z" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">MongoDB Core</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 opacity-30">
            <span className="text-lg">🔥</span>
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.115-.28-.394-.53-.954-.735-1.44-.036.495-.055.685-.523 1.184-.723.566-4.438 3.682-4.74 10.02-.282 5.912 4.27 9.435 4.888 9.884l.07.05A73.49 73.49 0 0111.91 24h.481c.114-1.032.284-2.056.51-3.07.417-.296 4.488-3.29 4.293-11.375z" />
            </svg>
          </div>
        )}
      </div>

      {/* User Section */}
      <div className={`px-6 py-6 border-t border-gray-50 flex items-center gap-4 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
          <span className="text-xs font-black text-gray-900 uppercase">AD</span>
        </div>
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-gray-900 uppercase truncate">Operator 001</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">Secure Access Level 5</p>
          </div>
        )}
      </div>
    </aside>
  )
}

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(280)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    setSidebarWidth(saved === 'true' ? 80 : 280)

    const handleStorage = () => {
      const saved = localStorage.getItem('sidebar-collapsed')
      setSidebarWidth(saved === 'true' ? 80 : 280)
    }

    window.addEventListener('storage', handleStorage)
    const interval = setInterval(() => {
      const saved = localStorage.getItem('sidebar-collapsed')
      const newWidth = saved === 'true' ? 80 : 280
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
      className="min-h-screen bg-neutral-50/50 transition-all duration-300"
      style={{ marginLeft: `${sidebarWidth}px` }}
    >
      <div className="fixed top-0 right-0 h-[600px] w-full pointer-events-none opacity-[0.03] z-0 overflow-hidden" style={{ left: `${sidebarWidth}px` }}>
        <div className="absolute -top-40 -right-40 w-full h-full bg-blue-500 blur-[150px] rounded-full"></div>
      </div>

      <div className="relative z-10 px-8 py-8 md:px-12 md:py-12">
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
      <body className="bg-white min-h-screen selection:bg-blue-100 selection:text-blue-900">
        <Sidebar />
        <RootLayoutContent>{children}</RootLayoutContent>
      </body>
    </html>
  )
}
