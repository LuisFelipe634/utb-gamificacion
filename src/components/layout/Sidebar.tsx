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
  Users,
  UserRound
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

const navigation = [
  { name: "Resumen", href: "/dashboard", icon: LayoutDashboard },
  { name: "Plan de estudios", href: "/malla", icon: BookOpen },
  { name: "Logros académicos", href: "/logros", icon: Trophy },
  { name: "Misiones & desafíos", href: "/misiones", icon: Target },
  { name: "Notificaciones", href: "/notificaciones", icon: Bell },
  { name: "Estadísticas", href: "/estadisticas", icon: BarChart3 },
]

const teacherNavigation = [
  { name: "Acompañamiento docente", href: "/docentes", icon: Users },
  { name: "Mi perfil docente", href: "/perfil-docente", icon: UserRound }
]

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isTeacher = session?.user?.role === "TEACHER"
  const [points, setPoints] = useState<number | null>(null)

  useEffect(() => {
    if (session?.user?.role !== "STUDENT") return

    fetch("/api/student")
      .then(async (response) => {
        if (!response.ok) return
        const data = await response.json() as { stats?: { totalPoints?: number } }
        setPoints(data.stats?.totalPoints ?? 0)
      })
      .catch(() => setPoints(null))
  }, [session?.user?.role])

  const displayName = session?.user?.name || "Estudiante"
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()

  return (
    <>
      {isOpen && <button type="button" aria-label="Cerrar menú de navegación" onClick={onClose} className="fixed inset-0 z-30 bg-black/30 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 flex-col overflow-hidden border-r border-[#e4eaf3] bg-[#fbfcfe] dark:border-gray-700 dark:bg-gray-900 lg:flex lg:z-40 ${isOpen ? "flex" : "hidden"}`}>
      <div className="px-7 pb-5 pt-6">
        <div className="flex flex-col items-center gap-4">
          <img 
            src="/utb-logotipo.png" 
            alt="UTB Logo" 
            className="w-40 h-auto object-contain dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
          />
          <span className="text-center text-[12px] font-medium text-[#0a33a6] dark:text-blue-300">
            Universidad Tecnológica de Bolívar
          </span>
        </div>
      </div>

      <div className="mx-5 rounded-[22px] border-2 border-[#edf1f7] bg-white px-4 py-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#abc3ff] text-2xl font-bold text-[#0a33a6] dark:bg-blue-900 dark:text-blue-200">
          {initials || <UserRound className="h-10 w-10" />}
        </div>
        <p className="mt-4 truncate text-lg font-semibold text-[#111b38] dark:text-white">{displayName}</p>
        {isTeacher ? (
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Docente</p>
        ) : (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#f0f3f8] px-3 py-2 text-[#111b38] dark:bg-gray-700 dark:text-gray-100">
            <Trophy className="h-5 w-5 fill-current" />
            <span className="text-sm font-semibold">{points === null ? "--" : points.toLocaleString("es-CO")} XP</span>
          </div>
        )}
        <Link
          href="/perfil"
          className="mt-3 w-full rounded-lg px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
          aria-label="Mi perfil"
        >
          Mi perfil
        </Link>
      </div>

      {/* Navigation */}
<nav className="flex-1 px-5 pb-8 pt-8">
        <p className="mb-4 px-2 text-xs font-bold uppercase tracking-wider text-[#7893b6] dark:text-blue-300">Trayectoria académica</p>
        {(isTeacher ? teacherNavigation : navigation).map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`relative flex items-center gap-4 rounded-xl px-4 py-4 text-[15px] transition-colors ${
                isActive
                  ? "bg-[#edf2f9] font-semibold text-[#0a33a6] dark:bg-blue-900/30 dark:text-blue-300"
                  : "text-[#17335c] hover:bg-[#f0f4fa] dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {isActive && <span className="absolute -left-3 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-[#1646d8]" />}
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.name}</span>
            </Link>
          )
        })}
</nav>

      </aside>
    </>
  )
}
