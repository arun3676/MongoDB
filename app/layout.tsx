'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, ChevronLeft, ChevronRight, FileText, Home, Moon, Shield, ShoppingCart, Sun } from 'lucide-react'
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
    label: 'Performance Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    label: 'Marketplace',
    href: '/marketplace',
    icon: ShoppingCart,
  },
]

function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isNightMode, setIsNightMode] = useState(false)
  const router = useRouter()

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const night = savedTheme === 'night'
    setIsNightMode(night)
    document.documentElement.setAttribute('data-theme', night ? 'night' : 'light')
  }, [])

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', String(newState))
  }

  const toggleTheme = () => {
    const next = !isNightMode
    setIsNightMode(next)
    localStorage.setItem('theme', next ? 'night' : 'light')
    document.documentElement.setAttribute('data-theme', next ? 'night' : 'light')
  }

  // Prefetch top-level nav routes for snappier navigation
  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href)
    })
  }, [router])

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
                prefetch
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

      </nav>

      {/* Theme Toggle */}
      <div className={`px-6 pb-6 ${isCollapsed ? 'px-4' : ''}`}>
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-600 transition hover:border-blue-200 ${isCollapsed ? 'px-3' : ''
            }`}
          aria-label="Toggle night mode"
        >
          {isCollapsed ? (
            isNightMode ? <Moon className="w-4 h-4 text-blue-500" /> : <Sun className="w-4 h-4 text-amber-500" />
          ) : (
            <>
              <span className="uppercase tracking-[0.2em]">Night Mode</span>
              <span
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition ${isNightMode ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${isNightMode ? 'translate-x-5' : 'translate-x-1'
                    }`}
                />
              </span>
            </>
          )}
        </button>
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
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)

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

  // Lightweight page transition feel on route change
  useEffect(() => {
    setIsTransitioning(true)
    const timeout = setTimeout(() => setIsTransitioning(false), 180)
    return () => clearTimeout(timeout)
  }, [pathname])

  return (
    <main
      className="min-h-screen bg-neutral-50/50 transition-all duration-300"
      style={{ marginLeft: `${sidebarWidth}px` }}
    >
      <div className="fixed top-0 right-0 h-[600px] w-full pointer-events-none opacity-[0.03] z-0 overflow-hidden" style={{ left: `${sidebarWidth}px` }}>
        <div className="absolute -top-40 -right-40 w-full h-full bg-blue-500 blur-[150px] rounded-full"></div>
      </div>

      <div
        className={`relative z-10 px-8 py-8 md:px-12 md:py-12 transition-all duration-200 ${isTransitioning ? 'opacity-60 translate-y-1' : 'opacity-100 translate-y-0'
          }`}
      >
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
      <body className="min-h-screen selection:bg-blue-100 selection:text-blue-900">
        <Sidebar />
        <RootLayoutContent>{children}</RootLayoutContent>
      </body>
    </html>
  )
}
