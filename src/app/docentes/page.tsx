"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { AlertTriangle, BookOpen, CheckCircle, ChevronDown, ChevronRight, Clock, Gift, Users } from "lucide-react"

type CourseStudent = {
  id: string
  name: string
  studentCode: string
  averageGrade: number
  totalCredits: number
  risk: string | null
}

type TeacherCourse = {
  id: string
  code: string
  name: string
  semester: number
  period: string
  students: CourseStudent[]
}

type PendingMission = {
  id: string
  title: string
  description: string
  points: number
  evidence: string | null
  completedAt: string | null
  status: string
  studentId?: string
  studentName?: string
  studentCode?: string
}

type MissionHistory = {
  id: string
  studentId: string
  studentName: string
  studentCode: string | null
  title: string
  points: number
  verifiedAt: string | null
}

type PendingReward = {
  id: string
  studentId: string
  studentName: string
  studentCode: string | null
  courses: {
    id: string
    code: string
    name: string
    semester: number
    period: string
    assignmentId: string | null
  }[]
  reward: {
    id: string
    name: string
    description: string
    icon: string
    category: string
    cost: number
  }
  pointsSpent: number
  evidence: string | null
  requestedAt: string
  expiresAt: string | null
}

type ReviewedReward = {
  id: string
  studentId: string
  studentName: string
  studentCode: string | null
  rewardName: string
  status: string
  pointsSpent: number
  reviewNote: string | null
  reviewedAt: string | null
  course: { id: string; code: string; name: string; semester: number }
}

export default function TeachersPage() {
  const { data: session } = useSession()
  const [courses, setCourses] = useState<TeacherCourse[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<"cursos" | "misiones" | "recompensas" | "historial">(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("section") === "recompensas") return "recompensas"
    return "cursos"
  })
  const [error, setError] = useState("")
  const [allPendingMissions, setPendingMissions] = useState<PendingMission[]>([])
  const [missionHistory, setMissionHistory] = useState<MissionHistory[]>([])
  const [pendingRewards, setPendingRewards] = useState<PendingReward[]>([])
  const [reviewedRewards, setReviewedRewards] = useState<ReviewedReward[]>([])
  const [reviewLoading, setReviewLoading] = useState<string | null>(null)
  const [reviewComment, setReviewComment] = useState<Record<string, string>>({})
  const [rewardReviewLoading, setRewardReviewLoading] = useState<string | null>(null)
  const [rewardReviewComment, setRewardReviewComment] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch("/api/teacher").then(async (response) => {
      if (!response.ok) throw new Error("No se pudo cargar el seguimiento")
      const result = await response.json()
      setCourses(result.courses)
      setSelectedCourseId(result.courses[0]?.id || "")
      setExpandedCourseId(result.courses[0]?.id || null)
      setPendingMissions(result.pendingMissions)
      setMissionHistory(result.missionHistory || [])
    }).catch(() => setError("No se pudo cargar la información de los estudiantes"))

    fetch("/api/teacher/rewards").then(async (response) => {
      if (!response.ok) return
      const result = await response.json()
      setPendingRewards(result.pending || [])
      setReviewedRewards(result.reviewed || [])
    }).catch(() => {})
  }, [])

  const reviewMission = async (studentMissionId: string, decision: "approve" | "reject") => {
    setReviewLoading(studentMissionId)
    try {
      const response = await fetch("/api/teacher", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentMissionId, decision, comment: reviewComment[studentMissionId] })
      })
      if (!response.ok) throw new Error((await response.json()).error || "No se pudo revisar la misión")
      setPendingMissions((missions) => missions.filter((mission) => mission.id !== studentMissionId))
    } catch (reviewError) {
      alert(reviewError instanceof Error ? reviewError.message : "No se pudo revisar la misión")
    } finally {
      setReviewLoading(null)
    }
  }

  const reviewReward = async (studentRewardId: string, decision: "approve" | "reject") => {
    setRewardReviewLoading(studentRewardId)
    try {
      const response = await fetch("/api/teacher/rewards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentRewardId, decision, comment: rewardReviewComment[studentRewardId] })
      })
      if (!response.ok) throw new Error((await response.json()).error || "No se pudo revisar la recompensa")
      setPendingRewards((rewards) => rewards.filter((reward) => reward.id !== studentRewardId))
      const refreshed = await fetch("/api/teacher/rewards")
      if (refreshed.ok) {
        const result = await refreshed.json()
        setReviewedRewards(result.reviewed || [])
      }
    } catch (reviewError) {
      alert(reviewError instanceof Error ? reviewError.message : "No se pudo revisar la recompensa")
    } finally {
      setRewardReviewLoading(null)
    }
  }

  const selectedCourse = courses.find((course) => course.id === selectedCourseId)
  const courseStudentIds = new Set(selectedCourse?.students.map((student) => student.id) || [])
  const pendingMissions = allPendingMissions.filter((mission) => mission.studentId && courseStudentIds.has(mission.studentId))
  const courseMissionHistory = missionHistory.filter((historyItem) => courseStudentIds.has(historyItem.studentId))
  const courseRewardHistory = selectedCourseId
    ? reviewedRewards.filter((reward) => reward.course.id === selectedCourseId)
    : reviewedRewards

  const teacherName = session?.user?.name || "Docente"
  const initials = teacherName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()

  const toggleCourse = (courseId: string) => {
    setSelectedCourseId(courseId)
    setExpandedCourseId((current) => (current === courseId ? null : courseId))
  }

  const totalStudents = courses.reduce((total, course) => total + course.students.length, 0)

  const navItem = (section: "cursos" | "misiones" | "recompensas" | "historial", icon: React.ReactNode, label: string, count: number, activeColor: string) => (
    <button type="button" onClick={() => setActiveSection(section)} className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${activeSection === section ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"}`}>
      <span className="flex min-w-0 items-center gap-2 truncate">{icon}{label}</span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${count > 0 ? (activeSection === section ? "bg-white/20 text-white" : activeColor) : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"}`}>{count}</span>
    </button>
  )

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Cuadro superior: perfil del profesor */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-center gap-5 p-6 sm:p-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">{initials || "D"}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Perfil docente</p>
            <h2 className="mt-1 truncate text-2xl font-bold text-slate-900 dark:text-white">{teacherName}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">Rol activo · Docente · Acompañamiento académico</p>
          </div>
          {!error && courses.length > 0 && (
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 font-semibold text-slate-700 dark:bg-gray-700 dark:text-gray-200"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-600" />{courses.length} cursos asignados</span>
              <span className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200"><Users className="h-4 w-4" />{totalStudents} estudiantes</span>
            </div>
          )}
        </div>
      </section>

      {error && <p className="rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Columna izquierda: navegación por categorías */}
        <aside className="h-fit rounded-xl border border-gray-200 bg-white shadow-xs p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Panel de revisión</p>
          <div className="mt-3 space-y-1">
            {navItem("cursos", <BookOpen className="h-4 w-4" />, "Acompañamiento docente", courses.length, "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300")}
            {navItem("misiones", <Clock className="h-4 w-4" />, "Misiones por revisar", pendingMissions.length, "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300")}
            {navItem("recompensas", <Gift className="h-4 w-4" />, "Revisión de recompensas", pendingRewards.length, "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300")}
            {navItem("historial", <CheckCircle className="h-4 w-4" />, "Historial", courseMissionHistory.length + courseRewardHistory.length, "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300")}
          </div>
          {selectedCourse && (
            <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Curso en revisión</p>
              <p className="mt-1 truncate text-sm font-bold text-gray-900 dark:text-white">{selectedCourse.code} · {selectedCourse.name}</p>
              <p className="text-xs text-gray-500">Semestre {selectedCourse.semester} · {selectedCourse.period}</p>
            </div>
          )}
        </aside>

        {/* Panel principal: una categoría a la vez */}
        <main className="min-w-0 space-y-6">
          {activeSection === "cursos" && (
            <section className="rounded-xl border border-gray-200 bg-white shadow-xs p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Acompañamiento docente</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Selecciona un curso asignado para ver sus estudiantes matriculados.</p>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{courses.length}</span>
              </div>

              {courses.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed p-6 text-sm text-gray-500">No tienes cursos asignados actualmente.</p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {courses.map((course) => {
                    const isExpanded = expandedCourseId === course.id
                    return (
                      <div key={course.id} className={`rounded-xl border transition-colors ${selectedCourseId === course.id ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30" : "border-gray-200 bg-white hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800"}`}>
                        <button type="button" onClick={() => toggleCourse(course.id)} className="flex w-full items-start justify-between gap-3 p-4 text-left">
                          <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">Semestre {course.semester} · {course.period}</p>
                            <h3 className="mt-1 font-bold text-gray-900 dark:text-white">{course.code} · {course.name}</h3>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{course.students.length} estudiantes inscritos</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <BookOpen className="h-5 w-5 shrink-0 text-blue-600" />
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="space-y-2 border-t border-blue-100 p-4 pt-3 dark:border-blue-900">
                            {course.students.map((student) => (
                              <div key={student.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 shadow-xs dark:bg-gray-700/60">
                                <div className="min-w-0">
                                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">{student.name}{student.risk && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><AlertTriangle className="h-3 w-3" /> Riesgo</span>}</p>
                                  <p className="text-xs text-gray-500">{student.studentCode}</p>
                                </div>
                                <div className="text-right text-xs text-gray-600 dark:text-gray-300">
                                  <p>Promedio: <strong>{student.averageGrade.toFixed(1)}</strong></p>
                                  <p>{student.totalCredits} créditos</p>
                                </div>
                              </div>
                            ))}
                            {!course.students.length && <p className="py-3 text-center text-sm text-gray-500">Sin estudiantes matriculados en este curso.</p>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {activeSection === "misiones" && selectedCourse && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-bold text-amber-900 dark:text-amber-100"><Clock className="h-5 w-5" /> Misiones por revisar</h2>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{selectedCourse.code} · {selectedCourse.name}. Revisa la evidencia antes de otorgar puntos.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-amber-700">{pendingMissions.length}</span>
              </div>
              <div className="mt-4 space-y-3">
                {pendingMissions.map((mission) => (
                  <div key={mission.id} className="rounded-lg bg-white p-4 dark:bg-gray-800">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{mission.studentName} · {mission.studentCode}</p>
                        <p className="text-sm">{mission.title} <span className="text-amber-600">(+{mission.points} pts)</span></p>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Evidencia: {mission.evidence || "Sin evidencia"}</p>
                      </div>
                      <span className="text-xs text-gray-500">{mission.completedAt ? new Date(mission.completedAt).toLocaleDateString("es-CO") : ""}</span>
                    </div>
                    <input value={reviewComment[mission.id] || ""} onChange={(event) => setReviewComment((comments) => ({ ...comments, [mission.id]: event.target.value }))} placeholder="Comentario opcional" className="mt-3 w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-700" />
                    <div className="mt-3 flex justify-end gap-2">
                      <button onClick={() => reviewMission(mission.id, "reject")} disabled={reviewLoading === mission.id} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Devolver</button>
                      <button onClick={() => reviewMission(mission.id, "approve")} disabled={reviewLoading === mission.id} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Aprobar y otorgar puntos</button>
                    </div>
                  </div>
                ))}
                {!pendingMissions.length && <p className="py-4 text-center text-sm text-amber-800 dark:text-amber-200">No hay misiones pendientes de revisión en este curso.</p>}
              </div>
            </section>
          )}

          {activeSection === "recompensas" && (
            <section className="rounded-xl border border-purple-200 bg-purple-50 p-6 dark:border-purple-900 dark:bg-purple-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-bold text-purple-900 dark:text-purple-100"><Gift className="h-5 w-5" /> Recompensas por revisar</h2>
                  <p className="mt-1 text-sm text-purple-800 dark:text-purple-200">Revisa las solicitudes de canje y los cursos donde cada estudiante está matriculado.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-purple-700">{pendingRewards.length}</span>
              </div>
              <div className="mt-4 space-y-3">
                {pendingRewards.length > 0 ? pendingRewards.map((reward) => (
                  <div key={reward.id} className="rounded-lg bg-white p-4 dark:bg-gray-800">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{reward.reward.icon}</span>
                        <div>
                          <p className="font-semibold">{reward.studentName} · {reward.studentCode}</p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">Cursos asociados a la solicitud</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {reward.courses.map((course) => <span key={`${reward.id}-${course.id}`} className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{course.code} · {course.name} · {course.period}</span>)}
                          </div>
                          <p className="text-sm">{reward.reward.name} <span className="text-purple-600">({reward.reward.cost.toLocaleString("es-CO")} pts)</span></p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{reward.reward.description}</p>
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Evidencia: {reward.evidence || "Sin evidencia"}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(reward.requestedAt).toLocaleDateString("es-CO")}</span>
                    </div>
                    <input value={rewardReviewComment[reward.id] || ""} onChange={(event) => setRewardReviewComment((comments) => ({ ...comments, [reward.id]: event.target.value }))} placeholder="Comentario opcional (motivo de rechazo, indicaciones...)" className="mt-3 w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-700" />
                    <div className="mt-3 flex justify-end gap-2">
                      <button onClick={() => reviewReward(reward.id, "reject")} disabled={rewardReviewLoading === reward.id} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Rechazar y reembolsar</button>
                      <button onClick={() => reviewReward(reward.id, "approve")} disabled={rewardReviewLoading === reward.id} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{rewardReviewLoading === reward.id ? "Procesando..." : "Aprobar bonificación"}</button>
                    </div>
                  </div>
                )) : <p className="py-4 text-center text-sm text-purple-600 dark:text-purple-400">No hay solicitudes de recompensa pendientes.</p>}
              </div>
            </section>
          )}

          {activeSection === "historial" && (
            <section className="rounded-xl border border-gray-200 bg-white shadow-xs p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white"><CheckCircle className="h-5 w-5 text-emerald-500" /> Historial docente</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Misiones verificadas y recompensas revisadas{selectedCourse ? ` en ${selectedCourse.code} · ${selectedCourse.name}` : "."}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{courseMissionHistory.length + courseRewardHistory.length}</span>
              </div>
              <div className="mt-4 space-y-3">
                {courseMissionHistory.map((historyItem) => (
                  <div key={historyItem.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-600/50 dark:bg-gray-700/40">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40"><CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900 dark:text-white">{historyItem.studentName} · {historyItem.studentCode}</p>
                        <p className="truncate text-sm text-gray-700 dark:text-gray-300">{historyItem.title} <span className="text-emerald-600 dark:text-emerald-400">(+{historyItem.points} pts)</span></p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-gray-500">{historyItem.verifiedAt ? new Date(historyItem.verifiedAt).toLocaleDateString("es-CO") : ""}</span>
                  </div>
                ))}
                {courseRewardHistory.map((reward) => (
                  <div key={reward.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-purple-100 bg-purple-50 p-4 dark:border-purple-900/50 dark:bg-purple-900/20">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{reward.studentName} · {reward.studentCode}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">Recompensa: {reward.rewardName} · {reward.course.code} · {reward.course.name}</p>
                      <p className={`text-xs font-semibold ${reward.status === "APROBADO" ? "text-emerald-600" : "text-red-600"}`}>{reward.status} · {reward.pointsSpent.toLocaleString("es-CO")} puntos</p>
                      {reward.reviewNote && <p className="mt-1 text-xs text-gray-500">Nota: {reward.reviewNote}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-gray-500">{reward.reviewedAt ? new Date(reward.reviewedAt).toLocaleDateString("es-CO") : ""}</span>
                  </div>
                ))}
                {!courseMissionHistory.length && !courseRewardHistory.length && <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">Aún no hay actividad histórica para este curso.</p>}
              </div>
            </section>
          )}

          {!selectedCourse && activeSection !== "cursos" && (
            <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed p-6 text-gray-500">Selecciona un curso desde la sección de cursos asignados.</div>
          )}
        </main>
      </div>
    </div>
  )
}