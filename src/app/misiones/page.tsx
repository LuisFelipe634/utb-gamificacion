"use client"

import { useState } from "react"
import {
  Target,
  Trophy,
  Clock,
  CheckCircle,
  Star,
  Flame,
  Zap,
  Award,
  Filter
} from "lucide-react"

// Datos de ejemplo
const mockMissions = [
  {
    id: 1,
    title: "Planificar Próximo Semestre",
    description: "Crea un plan de estudio para el próximo semestre incluyendo cursos y horarios",
    type: "PLANIFICACION",
    points: 150,
    progress: 60,
    status: "EN_PROGRESO",
    icon: "📋",
    difficulty: "Fácil",
    deadline: "2024-08-30"
  },
  {
    id: 2,
    title: "Completar Taller de Bases de Datos",
    description: "Realiza el taller práctico de SQL y diseño de bases de datos",
    type: "ACADEMICO",
    points: 200,
    progress: 30,
    status: "EN_PROGRESO",
    icon: "🗄️",
    difficulty: "Media",
    deadline: "2024-09-15"
  },
  {
    id: 3,
    title: "Mejorar Nota en Cálculo III",
    description: "Incrementa tu promedio en Cálculo III al menos 0.5 puntos",
    type: "MEJORA_CONTINUA",
    points: 250,
    progress: 45,
    status: "EN_PROGRESO",
    icon: "📈",
    difficulty: "Difícil",
    deadline: "2024-10-01"
  },
  {
    id: 4,
    title: "Asistir a 5 Clases Seguidas",
    description: "Mantén asistencia perfecta por 5 clases consecutivas",
    type: "HABITO_ESTUDIO",
    points: 100,
    progress: 80,
    status: "EN_PROGRESO",
    icon: "📅",
    difficulty: "Fácil",
    deadline: null
  },
  {
    id: 5,
    title: "Mentorar a un Compañero",
    description: "Ayuda a un compañero con una materia que domina",
    type: "IMPACTO_SOCIAL",
    points: 300,
    progress: 0,
    status: "PENDIENTE",
    icon: "👨‍🏫",
    difficulty: "Media",
    deadline: null
  },
  {
    id: 6,
    title: "Completar Curso de Electiva",
    description: "Finaliza exitosamente un curso electivo de tu elección",
    type: "ACADEMICO",
    points: 200,
    progress: 100,
    status: "COMPLETADA",
    icon: "🎓",
    difficulty: "Media",
    deadline: null,
    completedAt: "2024-07-15"
  },
  {
    id: 7,
    title: "Estudiar 10 Horas en una Semana",
    description: "Registra al menos 10 horas de estudio autónomo",
    type: "HABITO_ESTUDIO",
    points: 150,
    progress: 100,
    status: "COMPLETADA",
    icon: "⏰",
    difficulty: "Fácil",
    deadline: null,
    completedAt: "2024-07-10"
  }
]

const typeConfig = {
  ACADEMICO: { label: "Académico", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  PLANIFICACION: { label: "Planificación", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30" },
  MEJORA_CONTINUA: { label: "Mejora", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
  HABITO_ESTUDIO: { label: "Hábito", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" },
  IMPACTO_SOCIAL: { label: "Social", color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-100 dark:bg-pink-900/30" }
}

const statusConfig = {
  PENDIENTE: { label: "Pendiente", color: "text-gray-500 dark:text-gray-400", icon: Clock },
  EN_PROGRESO: { label: "En Progreso", color: "text-blue-600 dark:text-blue-400", icon: Target },
  COMPLETADA: { label: "Completada", color: "text-green-600 dark:text-green-400", icon: CheckCircle },
  VERIFICADA: { label: "Verificada", color: "text-purple-600 dark:text-purple-400", icon: Award }
}

const difficultyConfig = {
  "Fácil": { color: "text-green-600 dark:text-green-400", icon: Zap },
  "Media": { color: "text-yellow-600 dark:text-yellow-400", icon: Flame },
  "Difícil": { color: "text-red-600 dark:text-red-400", icon: Star }
}

export default function Misiones() {
  const [filter, setFilter] = useState<string>("all")

  const filteredMissions = mockMissions.filter((mission) => {
    if (filter === "all") return true
    if (filter === "active") return mission.status === "EN_PROGRESO"
    if (filter === "completed") return mission.status === "COMPLETADA" || mission.status === "VERIFICADA"
    return mission.type === filter
  })

  const totalPoints = mockMissions
    .filter((m) => m.status === "COMPLETADA" || m.status === "VERIFICADA")
    .reduce((acc, m) => acc + m.points, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Misiones</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Completa retos y gana puntos
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
          <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <span className="font-semibold text-yellow-700 dark:text-yellow-400">
            {totalPoints} pts ganados
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-5 h-5 text-gray-400" />
        {[
          { key: "all", label: "Todas" },
          { key: "active", label: "Activas" },
          { key: "completed", label: "Completadas" }
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

      {/* Missions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMissions.map((mission) => {
          const status = statusConfig[mission.status as keyof typeof statusConfig]
          const type = typeConfig[mission.type as keyof typeof typeConfig]
          const difficulty = difficultyConfig[mission.difficulty as keyof typeof difficultyConfig]
          const StatusIcon = status.icon
          const DiffIcon = difficulty.icon

          return (
            <div
              key={mission.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{mission.icon}</span>
                <div className="flex items-center gap-1">
                  <DiffIcon className={`w-4 h-4 ${difficulty.color}`} />
                  <span className={`text-xs font-medium ${difficulty.color}`}>
                    {mission.difficulty}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {mission.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                {mission.description}
              </p>

              {/* Type Badge */}
              <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${type.bg} ${type.color} mb-3`}>
                {type.label}
              </div>

              {/* Progress */}
              {mission.status === "EN_PROGRESO" && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Progreso</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {mission.progress}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                      style={{ width: `${mission.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1">
                  <StatusIcon className={`w-4 h-4 ${status.color}`} />
                  <span className={`text-sm ${status.color}`}>{status.label}</span>
                </div>
                <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-medium">+{mission.points}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
