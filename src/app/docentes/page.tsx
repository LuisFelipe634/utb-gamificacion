"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Award, BookOpen, Search, Sparkles, Users } from "lucide-react"

type Student = {
  id: string
  name: string
  email: string
  studentCode: string
  program: string
  semester: number
  averageGrade: number
  totalCredits: number
  totalProgramCredits: number
  completedCourses: number
  risk: string | null
  badges: { name: string; icon: string; category: string; earnedAt: string }[]
  recommendations: { title: string; description: string; priority: number }[]
  suggestedCourses: { code: string; name: string; credits: number; semester: number }[]
  pendingMissions: PendingMission[]
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

export default function TeachersPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")
  const [pendingMissions, setPendingMissions] = useState<PendingMission[]>([])
  const [reviewLoading, setReviewLoading] = useState<string | null>(null)
  const [reviewComment, setReviewComment] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch("/api/teacher").then(async (response) => {
      if (!response.ok) throw new Error("No se pudo cargar el seguimiento")
      const result = await response.json()
      setStudents(result.students)
      setPendingMissions(result.pendingMissions)
      setSelectedId(result.students[0]?.id || "")
    }).catch(() => setError("No se pudo cargar la información de los estudiantes"))
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

  const visibleStudents = students.filter((student) => `${student.name} ${student.studentCode}`.toLowerCase().includes(search.toLowerCase()))
  const selected = students.find((student) => student.id === selectedId) || visibleStudents[0]
  const progress = selected ? Math.round((selected.totalCredits / selected.totalProgramCredits) * 100) : 0

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header>
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">ACOMPAÑAMIENTO ACADÉMICO</p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Seguimiento de estudiantes</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Analiza el avance, reconoce logros y orienta la siguiente ruta académica.</p>
      </header>

      {error ? <p className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p> : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="relative mb-4"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar estudiante" className="w-full rounded-lg bg-gray-100 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700" /></div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-gray-500"><Users className="h-4 w-4" /> {visibleStudents.length} estudiantes</p>
            <div className="space-y-1">{visibleStudents.map((student) => <button key={student.id} onClick={() => setSelectedId(student.id)} className={`w-full rounded-lg p-3 text-left ${selected?.id === student.id ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "hover:bg-gray-50 dark:hover:bg-gray-700"}`}><span className="block font-semibold">{student.name}</span><span className="text-xs text-gray-500">{student.studentCode} · Semestre {student.semester}</span></button>)}</div>
          </aside>

          {selected ? <section className="space-y-6">
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-900/20"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-amber-900 dark:text-amber-100">Misiones por verificar</h2><p className="text-sm text-amber-800 dark:text-amber-200">Revisa la evidencia antes de otorgar puntos.</p></div><span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-amber-700">{pendingMissions.length}</span></div><div className="mt-4 space-y-3">{pendingMissions.map((mission) => <div key={mission.id} className="rounded-lg bg-white p-4 dark:bg-gray-800"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{mission.studentName} · {mission.studentCode}</p><p className="text-sm">{mission.title} <span className="text-amber-600">(+{mission.points} pts)</span></p><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Evidencia: {mission.evidence || "Sin evidencia"}</p></div><span className="text-xs text-gray-500">{mission.completedAt ? new Date(mission.completedAt).toLocaleDateString("es-CO") : ""}</span></div><input value={reviewComment[mission.id] || ""} onChange={(event) => setReviewComment((comments) => ({ ...comments, [mission.id]: event.target.value }))} placeholder="Comentario opcional" className="mt-3 w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-700" /><div className="mt-3 flex justify-end gap-2"><button onClick={() => reviewMission(mission.id, "reject")} disabled={reviewLoading === mission.id} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Devolver</button><button onClick={() => reviewMission(mission.id, "approve")} disabled={reviewLoading === mission.id} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Aprobar y otorgar puntos</button></div></div>)}{!pendingMissions.length && <p className="text-sm text-amber-800 dark:text-amber-200">No hay misiones pendientes de revisión.</p>}</div></section>
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selected.name}</h2><p className="text-gray-500">{selected.email} · {selected.program}</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Semestre {selected.semester}</span></div><div className="mt-6 grid gap-4 sm:grid-cols-3"><div><p className="text-sm text-gray-500">Promedio</p><p className="text-2xl font-bold">{selected.averageGrade.toFixed(1)}</p></div><div><p className="text-sm text-gray-500">Cursos aprobados</p><p className="text-2xl font-bold">{selected.completedCourses}</p></div><div><p className="text-sm text-gray-500">Créditos</p><p className="text-2xl font-bold">{selected.totalCredits} <span className="text-sm font-normal text-gray-500">/ {selected.totalProgramCredits}</span></p></div></div><div className="mt-5"><div className="mb-2 flex justify-between text-sm"><span>Progreso de la carrera</span><strong>{progress}%</strong></div><div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${progress}%` }} /></div></div></div>
            <div className="grid gap-6 xl:grid-cols-2"><div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"><h3 className="flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5 text-amber-500" /> Ruta recomendada</h3><p className="mt-1 text-sm text-gray-500">Cursos disponibles según los prerrequisitos aprobados.</p><div className="mt-4 space-y-2">{selected.suggestedCourses.map((course) => <div key={course.code} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700/60"><div><p className="font-semibold">{course.name}</p><p className="text-xs text-gray-500">{course.code} · Semestre {course.semester}</p></div><span className="text-sm text-gray-500">{course.credits} cr.</span></div>)}{!selected.suggestedCourses.length && <p className="text-sm text-gray-500">No hay cursos sugeridos con la información actual.</p>}</div></div><div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"><h3 className="flex items-center gap-2 text-lg font-bold"><Award className="h-5 w-5 text-amber-500" /> Logros e insignias</h3><div className="mt-4 grid gap-2 sm:grid-cols-2">{selected.badges.map((badge) => <div key={badge.name} className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20"><p className="font-semibold">{badge.icon} {badge.name}</p><p className="text-xs text-gray-500">{badge.category}</p></div>)}{!selected.badges.length && <p className="text-sm text-gray-500">Aún no registra insignias.</p>}</div></div></div>
            {selected.risk && <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200"><AlertTriangle className="h-5 w-5 shrink-0" /><p><strong>Alerta de acompañamiento:</strong> {selected.risk}</p></div>}
          </section> : <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed text-gray-500"><BookOpen className="mr-2 h-5 w-5" /> Selecciona un estudiante</div>}
        </div>
      )}
    </div>
  )
}