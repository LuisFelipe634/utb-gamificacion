"use client"

import { useState } from "react"
import {
  Trophy,
  Award,
  Star,
  Target,
  Users,
  TrendingUp,
  Lock,
  CheckCircle
} from "lucide-react"

// Datos de ejemplo
const mockBadges = [
  {
    id: 1,
    name: "Explorador",
    description: "Completa tu primer semestre con todas las materias",
    icon: "🎯",
    category: "PROGRESO",
    required: "100% cursos semestre 1",
    earned: true,
    earnedDate: "2024-03-15"
  },
  {
    id: 2,
    name: "Constante",
    description: "Asiste a clases por 4 semanas consecutivas sin faltar",
    icon: "📅",
    category: "HABITO",
    required: "4 semanas sin faltar",
    earned: true,
    earnedDate: "2024-04-20"
  },
  {
    id: 3,
    name: "Mentor",
    description: "Ayuda a 3 compañeros a aprobar un examen",
    icon: "👨‍🏫",
    category: "IMPACTO_SOCIAL",
    required: "3 compañeros ayudados",
    earned: true,
    earnedDate: "2024-05-10"
  },
  {
    id: 4,
    name: "Excelencia Académica",
    description: "Mantén un promedio superior a 4.5 por un semestre",
    icon: "⭐",
    category: "RENDIMIENTO",
    required: "Promedio > 4.5",
    earned: false,
    progress: 80,
    current: "4.2"
  },
  {
    id: 5,
    name: "Velocista",
    description: "Aprueba todos los cursos de un semestre en el primer intento",
    icon: "🚀",
    category: "PROGRESO",
    required: "100% aprobados primer intento",
    earned: false,
    progress: 60,
    current: "4/6 cursos"
  },
  {
    id: 6,
    name: "Especialista",
    description: "Obtén nota perfecta en 3 cursos diferentes",
    icon: "🏆",
    category: "COMPETENCIA",
    required: "3 cursos con nota 5.0",
    earned: false,
    progress: 33,
    current: "1/3 cursos"
  },
  {
    id: 7,
    name: "Investigador",
    description: "Participa en un proyecto de investigación",
    icon: "🔬",
    category: "IMPACTO_SOCIAL",
    required: "1 proyecto de investigación",
    earned: false,
    progress: 0,
    current: "No iniciado"
  },
  {
    id: 8,
    name: "Líder",
    description: "Organiza un evento académico con más de 20 asistentes",
    icon: "👑",
    category: "IMPACTO_SOCIAL",
    required: "1 evento organizado",
    earned: false,
    progress: 0,
    current: "No iniciado"
  }
]

const categoryConfig = {
  PROGRESO: { label: "Progreso", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30", icon: TrendingUp },
  HABITO: { label: "Hábito", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30", icon: Target },
  COMPETENCIA: { label: "Competencia", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30", icon: Award },
  IMPACTO_SOCIAL: { label: "Social", color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-100 dark:bg-pink-900/30", icon: Users },
  RENDIMIENTO: { label: "Rendimiento", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/30", icon: Star }
}

export default function Logros() {
  const [filter, setFilter] = useState<string>("all")

  const filteredBadges = mockBadges.filter((badge) => {
    if (filter === "all") return true
    if (filter === "earned") return badge.earned
    if (filter === "locked") return !badge.earned
    return badge.category === filter
  })

  const earnedCount = mockBadges.filter((b) => b.earned).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Logros e Insignias</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Colecciona insignias por tus logros académicos
        </p>
      </div>

      {/* Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {earnedCount} / {mockBadges.length}
              </p>
              <p className="text-gray-500 dark:text-gray-400">Insignias obtenidas</p>
            </div>
          </div>
          <div className="text-right">
            <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                style={{ width: `${(earnedCount / mockBadges.length) * 100}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {Math.round((earnedCount / mockBadges.length) * 100)}% completado
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "all", label: "Todas" },
          { key: "earned", label: "Obtenidas" },
          { key: "locked", label: "Bloqueadas" }
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredBadges.map((badge) => {
          const category = categoryConfig[badge.category as keyof typeof categoryConfig]
          const CatIcon = category.icon

          return (
            <div
              key={badge.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border p-5 transition-all hover:shadow-lg ${
                badge.earned
                  ? "border-yellow-300 dark:border-yellow-600"
                  : "border-gray-200 dark:border-gray-700 opacity-75"
              }`}
            >
              {/* Badge Icon */}
              <div className="relative mb-4">
                <span className="text-5xl">{badge.icon}</span>
                {!badge.earned && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-full w-14 h-14">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>

              {/* Name & Category */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">{badge.name}</h3>
                {badge.earned && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${category.bg} ${category.color} mb-2`}>
                <CatIcon className="w-3 h-3" />
                {category.label}
              </div>

              {/* Description */}
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {badge.description}
              </p>

              {/* Progress or Earned */}
              {badge.earned ? (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Obtenida {badge.earnedDate}</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{badge.current}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {badge.progress}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gray-400 to-gray-500 rounded-full"
                      style={{ width: `${badge.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Requiere: {badge.required}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
