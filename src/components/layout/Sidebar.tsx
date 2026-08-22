"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Target,
  Bell,
  BarChart3,
  Settings,
  GraduationCap,
  Users
} from "lucide-react"
import { useSession } from "next-auth/react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Malla Curricular", href: "/malla", icon: BookOpen },
  { name: "Misiones", href: "/misiones", icon: Target },
  { name: "Logros", href: "/logros", icon: Trophy },
  { name: "Notificaciones", href: "/notificaciones", icon: Bell },
  { name: "Estadísticas", href: "/estadisticas", icon: BarChart3 },
]

const teacherNavigation = [
  { name: "Acompañamiento docente", href: "/docentes", icon: Users }
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isTeacher = session?.user?.role === "TEACHER"

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white">UTB</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Gamificación</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {(isTeacher ? teacherNavigation : navigation).map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/configuracion"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Configuración</span>
        </Link>
      </div>
    </aside>
  )
}
