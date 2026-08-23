"use client"

import { Bell, Search, Moon, Sun, Loader2, LogOut } from "lucide-react"
import { useTheme } from "next-themes"
import { useState, useEffect, useEffectEvent, useSyncExternalStore } from "react"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"

function getInitials(name?: string | null) {
  if (!name) return "U"
  const names = name.trim().split(/\s+/)
  return (names.length >= 2
    ? `${names[0][0]}${names[names.length - 1][0]}`
    : names[0].substring(0, 2)
  ).toUpperCase()
}

export function Header() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const [unreadCount, setUnreadCount] = useState(0)
  const [userName, setUserName] = useState("")
  const [userInitials, setUserInitials] = useState("")
  const { data: session, status } = useSession()
  const profileRole = session?.user?.role
  const roleLabel = profileRole === "TEACHER" ? "Docente" :
    profileRole === "ADMIN" ? "Administrador" : "Estudiante"
  const displayName = userName || session?.user?.name || "Usuario"

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

  const loadAuthenticatedUser = useEffectEvent(fetchUserData)

  useEffect(() => {
    if (status === "authenticated" && profileRole === "STUDENT") {
      // The event loads external session data and updates the header state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadAuthenticatedUser()
    }
  }, [status, profileRole])

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" })
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
          aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
          title={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
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
          <Link href={profileRole === "TEACHER" ? "/docentes" : "/perfil"} className="flex items-center gap-3 rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700">
            <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {status === "loading" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  userInitials || getInitials(session?.user?.name)
                )}
              </span>
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {status === "loading" ? "Cargando..." : displayName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{roleLabel}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="ml-1 p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
