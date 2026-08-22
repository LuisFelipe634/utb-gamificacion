"use client"

import {
  TrendingUp,
  BookOpen,
  Trophy,
  Target,
  Clock,
  Award,
  BarChart3,
  PieChart
} from "lucide-react"

// Datos de ejemplo
const mockStats = {
  overall: {
    creditsApproved: 95,
    totalCredits: 160,
    averageGrade: 4.2,
    coursesCompleted: 18,
    totalCourses: 30,
    currentSemester: 6,
    totalSemesters: 10
  },
  byCategory: [
    { category: "Básicas", approved: 28, total: 32, percentage: 87.5 },
    { category: "Disciplinar", approved: 45, total: 72, percentage: 62.5 },
    { category: "Electivas", approved: 12, total: 24, percentage: 50 },
    { category: "Libre Elección", approved: 10, total: 16, percentage: 62.5 },
    { category: "General", approved: 8, total: 16, percentage: 50 }
  ],
  monthlyProgress: [
    { month: "Ene", credits: 12, grade: 4.0 },
    { month: "Feb", credits: 15, grade: 4.1 },
    { month: "Mar", credits: 18, grade: 4.0 },
    { month: "Abr", credits: 22, grade: 4.2 },
    { month: "May", credits: 25, grade: 4.1 },
    { month: "Jun", credits: 28, grade: 4.3 },
    { month: "Jul", credits: 30, grade: 4.2 },
    { month: "Ago", credits: 32, grade: 4.2 }
  ],
  achievements: {
    totalBadges: 8,
    earnedBadges: 3,
    totalMissions: 15,
    completedMissions: 7,
    totalPoints: 2450,
    level: 3,
    nextLevelPoints: 3000
  }
}

export default function Estadisticas() {
  const creditProgress = Math.round(
    (mockStats.overall.creditsApproved / mockStats.overall.totalCredits) * 100
  )

  const courseProgress = Math.round(
    (mockStats.overall.coursesCompleted / mockStats.overall.totalCourses) * 100
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Estadísticas</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Tu progreso académico y logros de gamificación
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Créditos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {mockStats.overall.creditsApproved}/{mockStats.overall.totalCredits}
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${creditProgress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{creditProgress}% completado</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Promedio</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {mockStats.overall.averageGrade}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-green-600 dark:text-green-400">
            ↑ 0.2 desde el último semestre
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Nivel</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {mockStats.achievements.level}
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{
                width: `${(mockStats.achievements.totalPoints / mockStats.achievements.nextLevelPoints) * 100}%`
              }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {mockStats.achievements.totalPoints}/{mockStats.achievements.nextLevelPoints} pts
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Insignias</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {mockStats.achievements.earnedBadges}/{mockStats.achievements.totalBadges}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-yellow-600 dark:text-yellow-400">
            {mockStats.achievements.completedMissions} misiones completadas
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress by Category */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            Progreso por Categoría
          </h2>
          <div className="space-y-4">
            {mockStats.byCategory.map((category) => (
              <div key={category.category}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{category.category}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {category.approved}/{category.total} ({category.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Course Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            Avance de Cursos
          </h2>
          <div className="flex items-center justify-center">
            <div className="relative">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - courseProgress / 100)}`}
                  className="text-blue-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {courseProgress}%
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">completado</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {mockStats.overall.coursesCompleted} de {mockStats.overall.totalCourses} cursos aprobados
            </p>
          </div>
        </div>
      </div>

      {/* Semester Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
          Progreso por Semestre
        </h2>
        <div className="flex items-end justify-between h-40">
          {mockStats.monthlyProgress.map((month, index) => {
            const height = (month.credits / 35) * 100
            return (
              <div key={month.month} className="flex flex-col items-center flex-1">
                <div
                  className="w-full max-w-[40px] bg-gradient-to-t from-blue-500 to-purple-600 rounded-t-lg transition-all duration-500"
                  style={{ height: `${height}%` }}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {month.month}
                </span>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>Créditos acumulados por mes</span>
        </div>
      </div>

      {/* Achievements Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
          Resumen de Logros
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <Target className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {mockStats.achievements.totalPoints.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Puntos Totales</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <Trophy className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {mockStats.achievements.earnedBadges}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Insignias</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {mockStats.achievements.completedMissions}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Misiones</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <Award className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              Nivel {mockStats.achievements.level}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Rango Actual</p>
          </div>
        </div>
      </div>
    </div>
  )
}
