"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, BarChart3, BookOpen, GraduationCap, Users } from "lucide-react"

type CoordinatorData = {
  program: { code: string; name: string; version: string; totalCredits: number; totalSemesters: number }
  indicators: { students: number; averageCredits: number; averageGrade: number; atRisk: number; levelIndicators: { level: number; students: number; averageCredits: number }[] }
  courses: { code: string; name: string; credits: number; semester: number; type: string }[]
  students: { id: string; name: string; code: string; semester: number; averageGrade: number; credits: number; badges: number; status: string }[]
}

export default function CoordinationPage() {
  const [data, setData] = useState<CoordinatorData | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/coordinator").then(async (response) => {
      if (!response.ok) throw new Error()
      setData(await response.json())
    }).catch(() => setError("No se pudo cargar la información del programa"))
  }, [])

  if (error) return <div className="rounded-xl bg-red-50 p-6 text-red-700">{error}</div>
  if (!data) return <div className="flex h-64 items-center justify-center text-gray-500">Cargando panel del programa...</div>

  const semesters = Array.from({ length: data.program.totalSemesters }, (_, index) => index + 1)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">GESTIÓN ACADÉMICA</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panel del programa</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Supervisa el avance y apoya la planificación de {data.program.name}.</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{data.program.code} · Plan {data.program.version}</span>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Estudiantes", value: data.indicators.students, icon: Users }, { label: "Créditos promedio", value: data.indicators.averageCredits, icon: BarChart3 }, { label: "Promedio del programa", value: data.indicators.averageGrade.toFixed(1), icon: GraduationCap }, { label: "Atención prioritaria", value: data.indicators.atRisk, icon: AlertTriangle }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"><Icon className="mb-3 h-5 w-5 text-emerald-600" /><p className="text-sm text-gray-500">{label}</p><p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p></div>)}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"><h2 className="flex items-center gap-2 text-xl font-bold"><BookOpen className="h-5 w-5 text-emerald-600" /> Malla académica</h2><p className="mt-1 text-sm text-gray-500">Consulta los cursos organizados por nivel.</p><div id="malla" className="mt-5 space-y-4">{semesters.map((semester) => { const courses = data.courses.filter((course) => course.semester === semester); return <div key={semester}><h3 className="mb-2 text-sm font-semibold text-gray-500">Semestre {semester}</h3><div className="grid gap-2 sm:grid-cols-2">{courses.map((course) => <div key={course.code} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/60"><p className="font-semibold">{course.name}</p><p className="text-xs text-gray-500">{course.code} · {course.credits} créditos</p></div>)}</div></div> })}</div></section>
        <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"><h2 className="flex items-center gap-2 text-xl font-bold"><Users className="h-5 w-5 text-emerald-600" /> Avance estudiantil</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-xs uppercase text-gray-500"><tr><th className="pb-3">Estudiante</th><th className="pb-3">Nivel</th><th className="pb-3">Créditos</th><th className="pb-3">Promedio</th></tr></thead><tbody>{data.students.map((student) => <tr key={student.id} className="border-b last:border-0"><td className="py-3"><p className="font-semibold">{student.name}</p><p className="text-xs text-gray-500">{student.code}</p></td><td className="py-3">{student.semester}</td><td className="py-3">{student.credits}</td><td className="py-3"><span className={student.averageGrade < 3 ? "font-semibold text-red-600" : ""}>{student.averageGrade.toFixed(1)}</span></td></tr>)}</tbody></table>{!data.students.length && <p className="py-8 text-center text-gray-500">No hay estudiantes registrados.</p>}</div></section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"><h2 className="text-xl font-bold">Indicadores por nivel académico</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{data.indicators.levelIndicators.map((indicator) => <div key={indicator.level} className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/60"><p className="text-sm text-gray-500">Nivel {indicator.level}</p><p className="mt-1 text-xl font-bold">{indicator.averageCredits} <span className="text-xs font-normal text-gray-500">cr. promedio</span></p><p className="text-xs text-gray-500">{indicator.students} estudiantes</p></div>)}</div></section>
    </div>
  )
}