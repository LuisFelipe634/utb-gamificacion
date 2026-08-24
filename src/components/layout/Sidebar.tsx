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
  GraduationCap,
  Users,
  UserRound
} from "lucide-react"
import { useSession } from "next-auth/react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Malla Curricular", href: "/malla", icon: BookOpen },
  { name: "Misiones", href: "/misiones", icon: Target },
  { name: "Logros", href: "/logros", icon: Trophy },
  { name: "Notificaciones", href: "/notificaciones", icon: Bell },
  { name: "Estadísticas", href: "/estadisticas", icon: BarChart3 },
  { name: "Mi perfil", href: "/perfil", icon: UserRound },
]

const teacherNavigation = [
  { name: "Acompañamiento docente", href: "/docentes", icon: Users },
  { name: "Mi perfil docente", href: "/perfil-docente", icon: UserRound }
]

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isTeacher = session?.user?.role === "TEACHER"

  return (
    <>
      {isOpen && <button type="button" aria-label="Cerrar menú de navegación" onClick={onClose} className="fixed inset-0 z-30 bg-black/30 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-56 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:static lg:z-auto ${isOpen ? "flex" : "hidden"}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center gap-1.5">
          <img 
            src="/utb-logotipo.png" 
            alt="UTB Logo" 
            className="w-20 h-auto object-contain dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
          />
          <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Gamificado
          </span>
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
              onClick={onClose}
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

      </aside>
    </>
  )
}
