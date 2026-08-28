"use client"

import { useEffect, useState } from "react"
import {
  CheckCircle,
  Lock,
  Unlock,
  Clock,
  ChevronDown,
  ChevronRight,
  BookOpen
} from "lucide-react"

type CurriculumCourse = {
  id?: string
  code: string
  name: string
  credits: number
  status: string
  selected?: boolean
  grade?: number | null
  missingPrerequisites?: string[]
}

type CurriculumSemester = {
  semester: number
  name?: string | null
  courses: CurriculumCourse[]
}

// Datos de ejemplo de la malla curricular
const mockCurriculum: CurriculumSemester[] = [
  {
    semester: 1,
    courses: [
      { code: "MAT101", name: "Cálculo I", credits: 4, status: "completed" },
      { code: "PRO101", name: "Introducción a la Programación", credits: 3, status: "completed" },
      { code: "FIS101", name: "Física I", credits: 4, status: "completed" },
      { code: "QUI101", name: "Química General", credits: 3, status: "completed" },
      { code: "ING101", name: "Inglés I", credits: 2, status: "completed" }
    ]
  },
  {
    semester: 2,
    courses: [
      { code: "MAT102", name: "Cálculo II", credits: 4, status: "completed" },
      { code: "PRO102", name: "Programación Orientada a Objetos", credits: 3, status: "completed" },
      { code: "FIS102", name: "Física II", credits: 4, status: "completed" },
      { code: "MAT103", name: "Álgebra Lineal", credits: 3, status: "completed" },
      { code: "ING102", name: "Inglés II", credits: 2, status: "completed" }
    ]
  },
  {
    semester: 3,
    courses: [
      { code: "MAT201", name: "Cálculo III", credits: 4, status: "in_progress" },
      { code: "PRO201", name: "Estructuras de Datos", credits: 3, status: "in_progress" },
      { code: "FIS201", name: "Física III", credits: 4, status: "available" },
      { code: "MAT202", name: "Probabilidad y Estadística", credits: 3, status: "available" },
      { code: "ING201", name: "Inglés III", credits: 2, status: "available" }
    ]
  },
  {
    semester: 4,
    courses: [
      { code: "PRO301", name: "Bases de Datos I", credits: 3, status: "blocked" },
      { code: "PRO302", name: "Sistemas Operativos", credits: 3, status: "blocked" },
      { code: "MAT301", name: "Ecuaciones Diferenciales", credits: 4, status: "blocked" },
      { code: "PRO303", name: "Algoritmos y Complejidad", credits: 3, status: "blocked" },
      { code: "GEN101", name: "Ética y Sociedad", credits: 2, status: "blocked" }
    ]
  },
  {
    semester: 5,
    courses: [
      { code: "PRO401", name: "Ingeniería de Software", credits: 4, status: "blocked" },
      { code: "PRO402", name: "Redes de Computadores", credits: 3, status: "blocked" },
      { code: "PRO403", name: "Inteligencia Artificial", credits: 3, status: "blocked" },
      { code: "ELE101", name: "Electiva I", credits: 3, status: "blocked" },
      { code: "GEN102", name: "Emprendimiento", credits: 2, status: "blocked" }
    ]
  },
  {
    semester: 6,
    courses: [
      { code: "PRO501", name: "Proyecto de Grado I", credits: 4, status: "blocked" },
      { code: "PRO502", name: "Seguridad Informática", credits: 3, status: "blocked" },
      { code: "ELE102", name: "Electiva II", credits: 3, status: "blocked" },
      { code: "ELE103", name: "Electiva III", credits: 3, status: "blocked" },
      { code: "GEN103", name: "Investigación", credits: 2, status: "blocked" }
    ]
  }
]

const statusConfig = {
  completed: {
    label: "Completado",
    color: "bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30 dark:border-green-600 dark:text-green-400",
    icon: CheckCircle
  },
  in_progress: {
    label: "Cursando",
    color: "bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400",
    icon: Clock
  },
  available: {
    label: "Disponible",
    color: "bg-yellow-100 border-yellow-500 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-400",
    icon: Unlock
  },
  blocked: {
    label: "Bloqueado",
    color: "bg-gray-100 border-gray-400 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400",
    icon: Lock
  }
}

export default function MallaCurricular() {
  const [expandedSemesters, setExpandedSemesters] = useState<number[]>([])
  const [curriculum, setCurriculum] = useState<CurriculumSemester[] | null>(null)
  const [selectedCredits, setSelectedCredits] = useState(0)
  const [period, setPeriod] = useState("")
  const [currentSemester, setCurrentSemester] = useState<number | null>(null)
  const [selectionLoading, setSelectionLoading] = useState<string | null>(null)
  const [selectionError, setSelectionError] = useState("")

  useEffect(() => {
    fetch("/api/curriculum").then(async (response) => {
      if (!response.ok) throw new Error("No se pudo cargar la malla")
      const data = await response.json()
      setCurriculum(data.semesters as CurriculumSemester[])
      setSelectedCredits(data.selectedCredits || 0)
      setPeriod(data.period || "")
      setCurrentSemester(data.currentSemester || null)
      setExpandedSemesters(data.currentSemester ? [data.currentSemester] : [])
    }).catch(() => {
      setCurriculum(mockCurriculum)
      setExpandedSemesters([1])
    })
  }, [])

  const toggleCourseSelection = async (course: CurriculumCourse) => {
    if (!course.id) return
    setSelectionLoading(course.id)
    setSelectionError("")
    const selected = !course.selected
    try {
      const response = await fetch("/api/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, selected })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "No se pudo actualizar la selección")
      setSelectedCredits(result.selectedCredits)
      setCurriculum((previous) => previous?.map((semester) => ({
        ...semester,
        courses: semester.courses.map((item) => item.id === course.id ? { ...item, selected, status: selected ? "in_progress" : item.status === "in_progress" ? "available" : item.status } : item)
      })) || null)
    } catch (error) {
      setSelectionError(error instanceof Error ? error.message : "No se pudo actualizar la selección")
    } finally {
      setSelectionLoading(null)
    }
  }

  const toggleSemester = (semester: number) => {
    setExpandedSemesters((prev) =>
      prev.includes(semester) ? prev.filter((s) => s !== semester) : [...prev, semester]
    )
  }

  const displayedCurriculum = curriculum || mockCurriculum
  const displayedTotalCredits = displayedCurriculum.reduce(
    (acc, semester) => acc + semester.courses.reduce((total, course) => total + course.credits, 0),
    0
  )
  const displayedCompletedCredits = displayedCurriculum
    .flatMap((semester) => semester.courses)
    .filter((course) => course.status === "completed")
    .reduce((acc, course) => acc + course.credits, 0)
  const enrolledCourses = displayedCurriculum
    .flatMap((semester) => semester.courses)
    .filter((course) => course.selected || course.status === "in_progress")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Malla Curricular
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Ingeniería de Sistemas - Plan 2019{currentSemester && ` · Semestre actual ${currentSemester}`}{period && ` · Periodo ${period}`}
        </p>
      </div>

      {selectionError && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600 dark:border-red-900 dark:bg-red-900/20">{selectionError}</p>}

      {/* Plan actual + Resumen de Avance — bloque único */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-gray-700 dark:bg-gray-800">
        {/* Cabecera unificada */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
                Plan 2019{period && ` · ${period}`} · Semestre {currentSemester || "-"}
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                Plan de estudios y avance
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                {displayedCompletedCredits} / {displayedTotalCredits} créditos aprobados · {selectedCredits} / 18 seleccionados
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {displayedTotalCredits ? Math.round((displayedCompletedCredits / displayedTotalCredits) * 100) : 0}%
            </span>
            <span className="hidden sm:inline-flex rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {selectedCredits} / 18 créditos
            </span>
          </div>
        </div>

        {/* Barra de progreso única */}
        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-700">
          <div
            className="h-2.5 rounded-full bg-blue-600 transition-all"
            style={{ width: `${displayedTotalCredits ? Math.round((displayedCompletedCredits / displayedTotalCredits) * 100) : 0}%` }}
          />
        </div>

        {/* Materias en curso / seleccionadas */}
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-gray-400">
            Materias en curso / seleccionadas · {enrolledCourses.length ? `${enrolledCourses.length} materias` : "sin materias"} {enrolledCourses.length ? `· ${enrolledCourses.reduce((acc, c) => acc + c.credits, 0)} créditos` : ""}
          </p>
          {enrolledCourses.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {enrolledCourses.map((course) => (
                <div
                  key={course.code}
                  className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/60"
                >
                  <p className="font-mono text-[11px] text-slate-400">{course.code}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white leading-tight">{course.name}</p>
                  <p className="mt-2 text-xs text-slate-500">{course.credits} créditos {course.selected || course.status === "in_progress" ? "· Cursando" : ""}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-gray-400">No hay materias seleccionadas o en curso para este semestre.</p>
          )}
        </div>

        {/* Leyenda */}
        <div className="mt-6 flex flex-wrap gap-4 border-t border-slate-100 pt-4 dark:border-gray-700">
          {Object.entries(statusConfig).map(([key, config]) => (
            <div key={key} className="flex items-center gap-2">
              <config.icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Curriculum Grid */}
      <div className="space-y-4">
        {displayedCurriculum.map((semester) => {
          const isExpanded = expandedSemesters.includes(semester.semester)
          const completedCount = semester.courses.filter((c) => c.status === "completed").length
          const totalCount = semester.courses.length

          return (
            <div
              key={semester.semester}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Semester Header */}
              <button
                onClick={() => toggleSemester(semester.semester)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{semester.semester}</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Semestre {semester.semester}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {completedCount}/{totalCount} cursos completados
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Courses */}
              {isExpanded && (
                <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {semester.courses.map((course) => {
                    const config = statusConfig[course.status as keyof typeof statusConfig]
                    return (
                      <div
                        key={course.code}
                        className={`p-4 rounded-lg border-l-4 ${config.color}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-mono text-xs opacity-75">{course.code}</p>
                            <p className="font-medium">{course.name}</p>
                            <p className="text-sm opacity-75">{course.credits} créditos</p>
                            {course.status === "blocked" && course.missingPrerequisites?.length ? (
                              <p className="mt-2 text-xs font-medium">Requiere: {course.missingPrerequisites.join(", ")}</p>
                            ) : null}
                          </div>
                          <config.icon className="w-5 h-5 opacity-75" />
                        </div>
                        {course.id && (course.status === "available" || course.selected) && (
                          <button
                            type="button"
                            onClick={() => toggleCourseSelection(course)}
                            disabled={selectionLoading === course.id}
                            className={`mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold ${course.selected ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-blue-600 text-white hover:bg-blue-700"} disabled:opacity-50`}
                          >
                            {selectionLoading === course.id ? "Actualizando..." : course.selected ? "Quitar del semestre" : "Agregar al semestre"}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
