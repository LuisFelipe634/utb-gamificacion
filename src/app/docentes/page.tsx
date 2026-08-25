"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Award, BookOpen, Flame, Search, Sparkles, Users } from "lucide-react"

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
  currentCourses: { code: string; name: string; credits: number; period: string }[]
  risk: string | null
  badges: { name: string; icon: string; category: string; earnedAt: string }[]
  recommendations: { title: string; description: string; priority: number }[]
  suggestedCourses: { code: string; name: string; credits: number; semester: number }[]
  pendingMissions: PendingMission[]
  streak: { current: number; best: number; activeToday: boolean }
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

type TeacherCourse = {
  id: string
  code: string
  name: string
  semester: number
  period: string
  students: { id: string; name: string; studentCode: string; averageGrade: number; totalCredits: number }[]
}

export default function TeachersPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [courses, setCourses] = useState<TeacherCourse[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [selectedId, setSelectedId] = useState("")
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")
  const [pendingMissions, setPendingMissions] = useState<PendingMission[]>([])
  const [reviewLoading, setReviewLoading] = useState<string | null>(null)
  const [reviewComment, setReviewComment] = useState<Record<string, string>>({})
  const [profileStudent, setProfileStudent] = useState<Student | null>(null)

  useEffect(() => {
    fetch("/api/teacher").then(async (response) => {
      if (!response.ok) throw new Error("No se pudo cargar el seguimiento")
      const result = await response.json()
      setCourses(result.courses)
      setSelectedCourseId(result.courses[0]?.id || "")
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

  const selectedCourse = courses.find((course) => course.id === selectedCourseId)
  const visibleStudents = students.filter((student) => {
    const belongsToCourse = selectedCourse?.students.some((courseStudent) => courseStudent.id === student.id) || false
    return belongsToCourse && `${student.name} ${student.studentCode}`.toLowerCase().includes(search.toLowerCase())
  })
  const selected = students.find((student) => student.id === selectedId) || visibleStudents[0]
  const progress = selected ? Math.round((selected.totalCredits / selected.totalProgramCredits) * 100) : 0

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="grid lg:grid-cols-[220px_1fr]">
            <div className="flex flex-col items-center justify-center border-b border-slate-200 bg-slate-50 p-6 text-center dark:border-gray-700 dark:bg-gray-900/40 lg:border-b-0 lg:border-r">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">AC</div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Rol activo</p>
              <h1 className="mt-1 font-bold text-slate-900 dark:text-white">Docente</h1>
              <p className="mt-1 text-xs text-slate-500">Acompañamiento académico</p>
            </div>
            <div className="p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Gestión académica</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Tus cursos y estudiantes</h2>
              <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-gray-400">Selecciona un curso para revisar el avance, reconocer logros y orientar a sus estudiantes.</p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm"><span className="rounded-full bg-slate-100 px-3 py-2 font-semibold text-slate-700 dark:bg-gray-700 dark:text-gray-200"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-600" />{courses.length} cursos asignados</span><span className="rounded-full bg-amber-50 px-3 py-2 font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">{students.length} estudiantes acompañados</span></div>
            </div>
          </div>
        </div>
      </header>

      {!error && <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => <button key={course.id} type="button" onClick={() => { setSelectedCourseId(course.id); setSelectedId(course.students[0]?.id || "") }} className={`rounded-xl border p-4 text-left transition-colors ${selectedCourseId === course.id ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30" : "border-gray-200 bg-white hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800"}`}>
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-gray-500">Semestre {course.semester} · {course.period}</p><h2 className="mt-1 font-bold text-gray-900 dark:text-white">{course.code} · {course.name}</h2></div><BookOpen className="h-5 w-5 shrink-0 text-blue-600" /></div>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{course.students.length} estudiantes inscritos</p>
        </button>)}
        {!courses.length && <p className="rounded-xl border border-dashed p-6 text-sm text-gray-500">No tienes cursos asignados actualmente.</p>}
      </section>}

      {error ? <p className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p> : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="relative mb-4"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar estudiante" className="w-full rounded-lg bg-gray-100 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700" /></div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-gray-500"><Users className="h-4 w-4" /> {visibleStudents.length} estudiantes</p>
            <div className="space-y-1">{visibleStudents.map((student) => <button key={student.id} onClick={() => setSelectedId(student.id)} className={`w-full rounded-lg p-3 text-left ${selected?.id === student.id ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "hover:bg-gray-50 dark:hover:bg-gray-700"}`}><span className="block font-semibold">{student.name}</span><span className="text-xs text-gray-500">{student.studentCode} · Semestre {student.semester}</span></button>)}</div>
          </aside>

          {selected ? <section className="space-y-6">
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-900/20"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-amber-900 dark:text-amber-100">Misiones por verificar</h2><p className="text-sm text-amber-800 dark:text-amber-200">Revisa la evidencia antes de otorgar puntos.</p></div><span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-amber-700">{pendingMissions.length}</span></div><div className="mt-4 space-y-3">{pendingMissions.map((mission) => <div key={mission.id} className="rounded-lg bg-white p-4 dark:bg-gray-800"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{mission.studentName} · {mission.studentCode}</p><p className="text-sm">{mission.title} <span className="text-amber-600">(+{mission.points} pts)</span></p><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Evidencia: {mission.evidence || "Sin evidencia"}</p></div><span className="text-xs text-gray-500">{mission.completedAt ? new Date(mission.completedAt).toLocaleDateString("es-CO") : ""}</span></div><input value={reviewComment[mission.id] || ""} onChange={(event) => setReviewComment((comments) => ({ ...comments, [mission.id]: event.target.value }))} placeholder="Comentario opcional" className="mt-3 w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-700" /><div className="mt-3 flex justify-end gap-2"><button onClick={() => reviewMission(mission.id, "reject")} disabled={reviewLoading === mission.id} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Devolver</button><button onClick={() => reviewMission(mission.id, "approve")} disabled={reviewLoading === mission.id} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Aprobar y otorgar puntos</button></div></div>)}{!pendingMissions.length && <p className="text-sm text-amber-800 dark:text-amber-200">No hay misiones pendientes de revisión.</p>}</div></section>
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selected.name}</h2><p className="text-gray-500">{selected.email} · {selected.program}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Semestre {selected.semester}</span><button type="button" onClick={() => setProfileStudent(selected)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Ver perfil completo</button></div></div><div className="mt-6 grid gap-4 sm:grid-cols-4"><div><p className="text-sm text-gray-500">Promedio</p><p className="text-2xl font-bold">{selected.averageGrade.toFixed(1)}</p></div><div><p className="text-sm text-gray-500">Cursos aprobados</p><p className="text-2xl font-bold">{selected.completedCourses}</p></div><div><p className="text-sm text-gray-500">Créditos</p><p className="text-2xl font-bold">{selected.totalCredits} <span className="text-sm font-normal text-gray-500">/ {selected.totalProgramCredits}</span></p></div><div><p className="text-sm text-gray-500">Racha</p><p className="flex items-center gap-1 text-2xl font-bold"><Flame className="h-5 w-5 text-orange-500" />{selected.streak.current} días</p><span className="text-xs text-gray-500">Mejor: {selected.streak.best} días</span></div></div><div className="mt-5"><div className="mb-2 flex justify-between text-sm"><span>Progreso de la carrera</span><strong>{progress}%</strong></div><div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${progress}%` }} /></div></div></div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"><h3 className="text-lg font-bold">Materias seleccionadas este semestre</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{selected.currentCourses.map((course) => <div key={course.code} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/60"><p className="font-semibold">{course.name}</p><p className="text-xs text-gray-500">{course.code} · {course.credits} créditos · {course.period}</p></div>)}{!selected.currentCourses.length && <p className="text-sm text-gray-500">El estudiante aún no ha seleccionado materias.</p>}</div></div>
            <div className="grid gap-6 xl:grid-cols-2"><div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"><h3 className="flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5 text-amber-500" /> Ruta recomendada</h3><p className="mt-1 text-sm text-gray-500">Cursos disponibles según los prerrequisitos aprobados.</p><div className="mt-4 space-y-2">{selected.suggestedCourses.map((course) => <div key={course.code} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700/60"><div><p className="font-semibold">{course.name}</p><p className="text-xs text-gray-500">{course.code} · Semestre {course.semester}</p></div><span className="text-sm text-gray-500">{course.credits} cr.</span></div>)}{!selected.suggestedCourses.length && <p className="text-sm text-gray-500">No hay cursos sugeridos con la información actual.</p>}</div></div><div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"><h3 className="flex items-center gap-2 text-lg font-bold"><Award className="h-5 w-5 text-amber-500" /> Logros e insignias</h3><div className="mt-4 grid gap-2 sm:grid-cols-2">{selected.badges.map((badge) => <div key={badge.name} className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20"><p className="font-semibold">{badge.icon} {badge.name}</p><p className="text-xs text-gray-500">{badge.category}</p></div>)}{!selected.badges.length && <p className="text-sm text-gray-500">Aún no registra insignias.</p>}</div></div></div>
            {selected.risk && <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200"><AlertTriangle className="h-5 w-5 shrink-0" /><p><strong>Alerta de acompañamiento:</strong> {selected.risk}</p></div>}
          </section> : <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed text-gray-500"><BookOpen className="mr-2 h-5 w-5" /> Selecciona un estudiante</div>}
        </div>
      )}

      {profileStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="student-profile-title">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4 dark:border-gray-700">
              <div><p className="text-sm font-semibold text-blue-600">PERFIL ACADÉMICO</p><h2 id="student-profile-title" className="text-2xl font-bold">{profileStudent.name}</h2><p className="text-sm text-gray-500">{profileStudent.email} · Código {profileStudent.studentCode}</p></div>
              <button type="button" onClick={() => setProfileStudent(null)} aria-label="Cerrar perfil" className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">Cerrar</button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-5">{[["Semestre", profileStudent.semester], ["Promedio", profileStudent.averageGrade.toFixed(1)], ["Cursos aprobados", profileStudent.completedCourses], ["Insignias", profileStudent.badges.length], ["Racha", `${profileStudent.streak.current} días`]].map(([label, value]) => <div key={label} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/60"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</div>
            <div className="mt-6"><h3 className="font-bold">Materias del semestre actual</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{profileStudent.currentCourses.map((course) => <div key={course.code} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"><p className="font-semibold">{course.name}</p><p className="text-xs text-gray-500">{course.code} · {course.credits} créditos · {course.period}</p></div>)}{!profileStudent.currentCourses.length && <p className="text-sm text-gray-500">No hay materias seleccionadas.</p>}</div></div>
            <div className="mt-6"><h3 className="font-bold">Logros e insignias</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{profileStudent.badges.map((badge) => <div key={badge.name} className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20"><p className="font-semibold">{badge.icon} {badge.name}</p><p className="text-xs text-gray-500">{badge.category}</p></div>)}{!profileStudent.badges.length && <p className="text-sm text-gray-500">No registra insignias.</p>}</div></div>
            <div className="mt-6"><h3 className="font-bold">Ruta recomendada</h3><div className="mt-3 space-y-2">{profileStudent.suggestedCourses.map((course) => <div key={course.code} className="flex justify-between rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20"><span><strong>{course.code}</strong> · {course.name}</span><span className="text-sm text-gray-500">{course.credits} cr.</span></div>)}{!profileStudent.suggestedCourses.length && <p className="text-sm text-gray-500">No hay recomendaciones disponibles.</p>}</div></div>
          </div>
        </div>
      )}
    </div>
  )
}