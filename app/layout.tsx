'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, ChevronLeft, ChevronRight, FileText, Home, Menu, Moon, Shield, ShoppingCart, Sun, X } from 'lucide-react'
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

function Sidebar({ isMobileOpen, onMobileClose }: { isMobileOpen: boolean; onMobileClose: () => void }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isNightMode, setIsNightMode] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

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

  // Close mobile menu on route change
  useEffect(() => {
    onMobileClose()
  }, [pathname, onMobileClose])

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen bg-carbon-500 z-50 flex flex-col transition-all duration-300 border-r border-carbon-300
          ${isCollapsed ? 'w-[80px]' : 'w-[280px]'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* Mobile Close Button */}
        <button
          onClick={onMobileClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-carbon-400 flex items-center justify-center md:hidden"
          aria-label="Close menu"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Logo / Brand */}
        <div className={`py-8 ${isCollapsed ? 'px-4' : 'px-8'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'}`}>
            <div className="w-12 h-12 rounded-2xl bg-mint-500 shadow-lg shadow-mint-500/20 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="text-lg font-black text-white tracking-tight leading-none mb-1 font-mono">Vigil</h1>
                <p className="text-[10px] font-black text-mint-500 uppercase tracking-[0.2em] opacity-80">v2.402 Protocol</p>
              </div>
            )}
          </div>
        </div>

        {/* Toggle Button (Desktop only) */}
        <button
          onClick={toggleCollapsed}
          className="absolute top-10 -right-3.5 w-7 h-7 rounded-full bg-white border border-gray-100 shadow-xl hidden md:flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group z-50"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-mint-500 transition-colors" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-gray-400 group-hover:text-mint-500 transition-colors" />
          )}
        </button>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-8 overflow-y-auto">
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className={`flex items-center rounded-2xl transition-all duration-300 group ${isCollapsed ? 'justify-center p-3.5' : 'gap-4 px-5 py-4'
                    } ${isActive
                      ? 'bg-mint-500/20 text-mint-500'
                      : 'hover:bg-mint-500/10 hover:text-mint-500 text-gray-400'
                    } font-bold`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 transition-colors shrink-0 ${isActive ? 'text-mint-500' : 'group-hover:text-mint-500'} ${isCollapsed ? '' : 'opacity-70'}`} />
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
            className={`w-full flex items-center justify-between rounded-xl border border-carbon-300 bg-carbon-400 px-4 py-3 text-xs font-bold text-gray-300 transition hover:border-mint-500/30 ${isCollapsed ? 'px-3' : ''
              }`}
            aria-label="Toggle night mode"
          >
            {isCollapsed ? (
              isNightMode ? <Moon className="w-4 h-4 text-mint-500" /> : <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <>
                <span className="uppercase tracking-[0.2em]">Night Mode</span>
                <span
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition ${isNightMode ? 'bg-mint-500' : 'bg-gray-300'
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
        <div className={`px-6 py-6 border-t border-carbon-300 flex items-center gap-4 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-carbon-400 flex items-center justify-center shrink-0 border border-carbon-300">
            <span className="text-xs font-black text-white uppercase">AD</span>
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-white uppercase truncate">Operator 001</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">Secure Access Level 5</p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-carbon-500 border-b border-carbon-300 z-30 flex items-center px-4 md:hidden">
      <button
        onClick={onMenuClick}
        className="w-10 h-10 rounded-xl bg-carbon-400 flex items-center justify-center"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-white" />
      </button>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-mint-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-black text-white font-mono">Vigil</span>
        </div>
      </div>
      <div className="w-10" /> {/* Spacer for centering */}
    </header>
  )
}

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  return (
    <>
      <MobileHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />
      <main
        className="min-h-screen bg-carbon-500 transition-all duration-300 pt-16 md:pt-0"
        style={{ marginLeft: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${sidebarWidth}px` : '0px' }}
      >
        <div
          className="fixed top-0 right-0 h-[600px] w-full pointer-events-none opacity-[0.03] z-0 overflow-hidden hidden md:block"
          style={{ left: `${sidebarWidth}px` }}
        >
          <div className="absolute -top-40 -right-40 w-full h-full bg-mint-500 blur-[150px] rounded-full"></div>
        </div>

        <div
          className={`relative z-10 px-4 py-6 md:px-12 md:py-12 transition-all duration-200 ${isTransitioning ? 'opacity-60 translate-y-1' : 'opacity-100 translate-y-0'
            }`}
        >
          {children}
        </div>
      </main>
    </>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    document.title = 'Vigil | Autonomous Fraud Defense'
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Autonomous Economic Fraud Defense')
    } else {
      const meta = document.createElement('meta')
      meta.name = 'description'
      meta.content = 'Autonomous Economic Fraud Defense'
      document.head.appendChild(meta)
    }
  }, [])

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#121212" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen selection:bg-mint-500/20 selection:text-mint-500 overflow-x-hidden">
        {mounted ? (
          <RootLayoutContent>{children}</RootLayoutContent>
        ) : (
          <div className="min-h-screen bg-carbon-500 flex items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-mint-500 animate-pulse flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>
        )}
      </body>
    </html>
  )
}
