"use client"

import { useState, useEffect, useEffectEvent } from "react"
import {
  BookOpen,
  Trophy,
  Target,
  TrendingUp,
  Award,
  AlertTriangle,
  Bell,
  ChevronRight,
  Flame,
  Loader2,
  Lightbulb,
  X,
  CheckCircle2,
  Lock,
  Clock
} from "lucide-react"
import Link from "next/link"

interface StudentData {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
  profile: {
    studentCode: string
    currentSemester: number
    totalCredits: number
    averageGrade: number
    level: number
    program: {
      name: string
      totalCredits: number
    }
  }
  stats: {
    totalPoints: number
    currentLevel: string
    currentLevelNumber: number
    nextLevel: string | null
    nextLevelPoints: number
    pointsToNextLevel: number
    activeMissionsCount: number
    completedMissionsCount: number
    streak: { current: number; best: number; activeToday: boolean }
    badgesCount: number
  }
  missions: Array<{
    id: string
    title: string
    description: string
    type: string
    points: number
    progress: number
    status: string
    completedAt: string | null
  }>
  recentBadges: Array<{
    id: string
    name: string
    icon: string
    earned: string
  }>
  notifications: Array<{
    id: string
    title: string
    message: string
    type: string
    isRead: boolean
    createdAt: string
  }>
  unreadCount: number
}

interface RecommendationData {
  id: string
  type: string
  title: string
  description: string
  priority: number
  isRead: boolean
}

interface CurrentCourse {
  id: string
  code: string
  name: string
  credits: number
  status: "completed" | "in_progress" | "available" | "blocked"
  selected: boolean
  grade: number | null
}

export default function Dashboard() {
  const [data, setData] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [recommendations, setRecommendations] = useState<RecommendationData[]>([])
  const [currentCourses, setCurrentCourses] = useState<CurrentCourse[]>([])
  const [curriculumPeriod, setCurriculumPeriod] = useState("")

  const fetchStudentData = async () => {
    try {
      const response = await fetch("/api/student")
      if (!response.ok) {
        throw new Error("Error al cargar datos")
      }
      const result = await response.json()
      setData(result)

      try {
        const curriculumResponse = await fetch("/api/curriculum")
        if (curriculumResponse.ok) {
          const curriculum = await curriculumResponse.json()
          const semester = curriculum.semesters?.find((item: { semester: number }) => item.semester === curriculum.currentSemester)
          setCurrentCourses(semester?.courses || [])
          setCurriculumPeriod(curriculum.period || "")
        }
      } catch {
        // Curriculum is supplementary to the dashboard summary.
      }

      // Fetch recommendations in parallel
      try {
        const recResponse = await fetch("/api/recommendations")
        if (recResponse.ok) {
          const recs = await recResponse.json()
          setRecommendations(recs)
        }
      } catch {
        // Silently fail — recommendations are non-critical
      }
    } catch (err) {
      setError("Error al cargar los datos del estudiante")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const dismissRecommendation = async (id: string) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== id))
    try {
      await fetch("/api/recommendations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId: id }),
      })
    } catch {
      // Silently fail
    }
  }

  const loadStudentData = useEffectEvent(fetchStudentData)

  useEffect(() => {
    // The event loads external student data and updates the dashboard state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStudentData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando...</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{error || "No se pudieron cargar los datos"}</p>
          <button
            onClick={fetchStudentData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!data.profile || !data.profile.program) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Esta vista está disponible únicamente para estudiantes.
          </p>
          <Link
            href="/docentes"
            className="inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Ir al acompañamiento docente
          </Link>
        </div>
      </div>
    )
  }

  const progressPercentage = Math.round(
    (data.profile.totalCredits / data.profile.program.totalCredits) * 100
  )

  // Filtrar misiones activas
  const activeMissions = data.missions
    .filter((m) => m.status === "EN_PROGRESO" || m.status === "PENDIENTE")
    .slice(0, 3)

  // Obtener no leídas para alertas
  const alerts = data.notifications.slice(0, 3)
  const courseStatus = {
    completed: { label: "Completado", color: "text-emerald-700 bg-emerald-50 border-emerald-100", icon: CheckCircle2 },
    in_progress: { label: "En curso", color: "text-blue-700 bg-blue-50 border-blue-100", icon: Clock },
    available: { label: "Disponible", color: "text-amber-700 bg-amber-50 border-amber-100", icon: BookOpen },
    blocked: { label: "Bloqueado", color: "text-gray-500 bg-gray-50 border-gray-200", icon: Lock }
  } as const

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="grid lg:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-center justify-center border-b border-slate-200 bg-slate-50 p-6 text-center dark:border-gray-700 dark:bg-gray-900/40 lg:border-b-0 lg:border-r">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">{data.user.name.split(" ").map((name) => name[0]).slice(0, 2).join("")}</div>
            <h1 className="mt-4 font-bold text-slate-900 dark:text-white">{data.user.name}</h1>
            <p className="mt-1 text-xs text-slate-500">{data.profile.studentCode}</p>
            <div className="mt-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">Nivel {data.stats.currentLevelNumber} · {data.stats.totalPoints.toLocaleString()} XP</div>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Trayectoria académica</p><h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Tu camino hacia la excelencia</h2><p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-gray-400">Cada curso aprobado acerca tu avance a la meta de {data.profile.program.name}.</p></div>
              <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-gray-700 dark:text-gray-200"><span className="h-2 w-2 rounded-full bg-emerald-500" />{progressPercentage}% completado</div>
            </div>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-700"><div className="h-full rounded-full bg-blue-600 transition-all duration-700" style={{ width: `${progressPercentage}%` }} /></div>
            <div className="mt-2 flex justify-between text-xs text-slate-500"><span>{data.profile.totalCredits} créditos aprobados</span><span>{data.profile.program.totalCredits} créditos totales</span></div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Plan actual {curriculumPeriod && `· ${curriculumPeriod}`}</p><h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Semestre {data.profile.currentSemester}</h2></div><Link href="/malla" className="text-sm font-semibold text-blue-600 hover:text-blue-700">Ver plan completo <ChevronRight className="inline h-4 w-4" /></Link></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {currentCourses.filter((course) => course.status === "in_progress" || course.selected).slice(0, 4).map((course) => { const status = courseStatus[course.status]; const StatusIcon = status.icon; return <div key={course.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[11px] text-slate-400">{course.code}</p><h3 className="mt-1 font-semibold text-slate-900 dark:text-white">{course.name}</h3></div><StatusIcon className="h-5 w-5 shrink-0 text-blue-600" /></div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-gray-700"><span className={`rounded-full border px-2 py-1 font-semibold ${status.color}`}>{status.label}</span><span className="text-slate-500">{course.credits} créditos</span></div></div> })}
          {!currentCourses.some((course) => course.status === "in_progress" || course.selected) && <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-gray-600">No hay cursos activos registrados para este semestre.</div>}
        </div>
      </section>

      {/* Recommendations Banner */}
      {recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Recomendaciones para ti</h2>
          </div>
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                  rec.priority === 1
                    ? "bg-orange-50 dark:bg-orange-900/15 border-orange-200 dark:border-orange-800"
                    : rec.priority === 2
                    ? "bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700"
                    : "bg-green-50 dark:bg-green-900/15 border-green-200 dark:border-green-800"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-white">
                    {rec.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {rec.description}
                  </p>
                </div>
                <button
                  onClick={() => dismissRecommendation(rec.id)}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Descartar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <Link
            href="/malla"
            className="inline-flex items-center gap-1 mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Ver malla curricular <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Nivel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Nivel</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {data.stats.currentLevelNumber}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                {data.stats.currentLevel}
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
                {data.stats.totalPoints.toLocaleString()}
              </p>
              {data.stats.nextLevel && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {data.stats.pointsToNextLevel} pts para {data.stats.nextLevel}
                </p>
              )}
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
                {data.profile.averageGrade.toFixed(1)}
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
                {data.profile.currentSemester}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Racha */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Racha académica</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.stats.streak.current} días</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Mejor: {data.stats.streak.best} días</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Progreso de la Carrera</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {data.profile.totalCredits} / {data.profile.program.totalCredits} créditos
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
            {activeMissions.length > 0 ? (
              activeMissions.map((mission) => (
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
              ))
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No tienes misiones activas</p>
                <Link
                  href="/misiones"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Explorar misiones disponibles
                </Link>
              </div>
            )}
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
              {data.recentBadges.length > 0 ? (
                data.recentBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <span className="text-2xl">{badge.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {badge.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(badge.earned).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Trophy className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Aún no tienes insignias
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Notificaciones</h2>
              <Link
                href="/notificaciones"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Ver todas
              </Link>
            </div>
            <div className="space-y-3">
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      alert.type === "ALERTA_RIESGO"
                        ? "bg-yellow-50 dark:bg-yellow-900/20"
                        : alert.type === "WARNING"
                        ? "bg-orange-50 dark:bg-orange-900/20"
                        : "bg-blue-50 dark:bg-blue-900/20"
                    }`}
                  >
                    <AlertTriangle
                      className={`w-5 h-5 mt-0.5 ${
                        alert.type === "ALERTA_RIESGO"
                          ? "text-yellow-600 dark:text-yellow-400"
                          : alert.type === "WARNING"
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-blue-600 dark:text-blue-400"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {alert.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {alert.message}
                      </p>
                    </div>
                    {!alert.isRead && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No hay notificaciones nuevas
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
