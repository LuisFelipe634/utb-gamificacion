"use client"

import { Bell, Search, Moon, Sun, Loader2 } from "lucide-react"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"

export function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [userName, setUserName] = useState("")
  const [userInitials, setUserInitials] = useState("")
  const { data: session, status } = useSession()

  useEffect(() => {
    setMounted(true)
    if (status === "authenticated") {
      fetchUserData()
    }
  }, [status])

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/student")
      if (response.ok) {
        const data = await response.json()
        setUserName(data.user.name)
        setUnreadCount(data.unreadCount)
        
        // Generate initials from name
        const names = data.user.name.split(" ")
        const initials = names.length >= 2
          ? `${names[0][0]}${names[names.length - 1][0]}`
          : names[0].substring(0, 2)
        setUserInitials(initials.toUpperCase())
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    }
  }

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cursos, misiones, logros..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {mounted && theme === "dark" ? (
            <Sun className="w-5 h-5 text-gray-400" />
          ) : (
            <Moon className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {/* Notifications */}
        <Link
          href="/notificaciones"
          className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Bell className="w-5 h-5 text-gray-400" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
          <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {status === "loading" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                userInitials || "U"
              )}
            </span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {status === "loading" ? "Cargando..." : userName || "Usuario"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Estudiante</p>
          </div>
        </div>
      </div>
    </header>
  )
}
