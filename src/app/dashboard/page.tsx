"use client"

import {
  BookOpen,
  Trophy,
  Target,
  TrendingUp,
  Award,
  Clock,
  AlertTriangle,
  ChevronRight
} from "lucide-react"
import Link from "next/link"

// Datos de ejemplo (luego se obtendrán de la API)
const mockData = {
  student: {
    name: "Juan Pérez",
    program: "Ingeniería de Sistemas",
    semester: 6,
    level: 3,
    points: 2450,
    average: 4.2,
    creditsApproved: 95,
    totalCredits: 160
  },
  recentBadges: [
    { id: 1, name: "Explorador", icon: "🎯", earned: "Hace 2 días" },
    { id: 2, name: "Constante", icon: "📅", earned: "Hace 1 semana" },
    { id: 3, name: "Mentor", icon: "👨‍🏫", earned: "Hace 2 semanas" }
  ],
  activeMissions: [
    { id: 1, title: "Planificar próximo semestre", progress: 60, points: 150 },
    { id: 2, title: "Completar taller de bases de datos", progress: 30, points: 200 },
    { id: 3, title: "Mejorar nota en Cálculo III", progress: 45, points: 250 }
  ],
  alerts: [
    { id: 1, type: "warning", message: "Faltan 2 créditos para desbloquear Redes" },
    { id: 2, type: "info", message: "Nuevo semestre disponible para planificación" }
  ]
}

export default function Dashboard() {
  const progressPercentage = Math.round(
    (mockData.student.creditsApproved / mockData.student.totalCredits) * 100
  )

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ¡Hola, {mockData.student.name}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Aquí tienes tu resumen de progreso académico
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Nivel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Nivel</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {mockData.student.level}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Puntos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Puntos</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {mockData.student.points.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Promedio */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Promedio</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {mockData.student.average}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Semestre */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Semestre</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {mockData.student.semester}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Progreso de la Carrera</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {mockData.student.creditsApproved} / {mockData.student.totalCredits} créditos
          </span>
        </div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {progressPercentage}% completado
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Missions */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Misiones Activas</h2>
            <Link
              href="/misiones"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Ver todas <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {mockData.activeMissions.map((mission) => (
              <div
                key={mission.id}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {mission.title}
                  </span>
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">
                    +{mission.points} pts
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${mission.progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {mission.progress}% completado
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Badges & Alerts */}
        <div className="space-y-6">
          {/* Recent Badges */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Logros Recientes</h2>
              <Link
                href="/logros"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Ver todos
              </Link>
            </div>
            <div className="space-y-3">
              {mockData.recentBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {badge.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{badge.earned}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Alertas</h2>
            <div className="space-y-3">
              {mockData.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    alert.type === "warning"
                      ? "bg-yellow-50 dark:bg-yellow-900/20"
                      : "bg-blue-50 dark:bg-blue-900/20"
                  }`}
                >
                  <AlertTriangle
                    className={`w-5 h-5 mt-0.5 ${
                      alert.type === "warning"
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-blue-600 dark:text-blue-400"
                    }`}
                  />
                  <p className="text-sm text-gray-700 dark:text-gray-300">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
