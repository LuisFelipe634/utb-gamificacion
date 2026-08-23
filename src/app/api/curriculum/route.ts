import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentSemester } from "@/lib/academic"

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${now.getMonth() < 6 ? 1 : 2}`
}

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Información exclusiva para estudiantes" }, { status: 403 })
  }

  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        program: { include: { semesters: { include: { courses: { include: { prerequisites: { include: { prerequisite: true } } } } }, orderBy: { number: "asc" } } } },
        enrollments: { include: { course: { include: { semester: true } } } }
      }
    })

    if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })

    const period = currentPeriod()
    const currentSemester = getCurrentSemester(profile.enrollments, profile.currentSemester)
    const enrollmentByCourse = new Map(profile.enrollments.map((enrollment) => [enrollment.courseId, enrollment]))
    const approvedIds = new Set(profile.enrollments.filter((enrollment) => enrollment.status === "APROBADO").map((enrollment) => enrollment.courseId))
    const selectedIds = new Set(profile.enrollments.filter((enrollment) => enrollment.status === "CURSANDO" && enrollment.semesterCode === period).map((enrollment) => enrollment.courseId))
    const selectedCredits = profile.enrollments.filter((enrollment) => enrollment.status === "CURSANDO" && enrollment.semesterCode === period).reduce((total, enrollment) => total + enrollment.course.credits, 0)
    const semesters = profile.program.semesters.map((semester) => ({
      semester: semester.number,
      name: semester.name,
      courses: semester.courses.map((course) => {
        const enrollment = enrollmentByCourse.get(course.id)
        const status = enrollment?.status === "APROBADO" ? "completed" :
          enrollment?.status === "CURSANDO" ? "in_progress" :
            enrollment?.status === "REPROBADO" ? "available" : "blocked"
        const prerequisitesMet = course.prerequisites.every(({ prerequisite }) => approvedIds.has(prerequisite.id))
        return { id: course.id, code: course.code, name: course.name, credits: course.credits, status: status === "blocked" && prerequisitesMet ? "available" : status, grade: enrollment?.grade ?? null, selected: selectedIds.has(course.id), prerequisitesMet }
      })
    }))

    return NextResponse.json({ program: { name: profile.program.name, code: profile.program.code, version: profile.program.version }, period, currentSemester, selectedCredits, semesters })
  } catch (error) {
    console.error("Error fetching curriculum:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "STUDENT") return NextResponse.json({ error: "Solo los estudiantes pueden seleccionar cursos" }, { status: 403 })

  try {
    const { courseId, selected } = await request.json()
    if (typeof courseId !== "string" || typeof selected !== "boolean") return NextResponse.json({ error: "Selección inválida" }, { status: 400 })
    const profile = await prisma.studentProfile.findUnique({ where: { userId: session.user.id }, include: { enrollments: { include: { course: true } }, program: true } })
    const course = await prisma.course.findUnique({ where: { id: courseId }, include: { prerequisites: { include: { prerequisite: true } } } })
    if (!profile || !course || course.programId !== profile.programId) return NextResponse.json({ error: "Curso no disponible" }, { status: 404 })
    if (profile.enrollments.some((enrollment) => enrollment.courseId === courseId && enrollment.status === "APROBADO")) return NextResponse.json({ error: "El curso ya fue aprobado" }, { status: 400 })

    const approvedIds = new Set(profile.enrollments.filter((enrollment) => enrollment.status === "APROBADO").map((enrollment) => enrollment.courseId))
    if (!course.prerequisites.every(({ prerequisite }) => approvedIds.has(prerequisite.id))) return NextResponse.json({ error: "Aún no cumples los prerrequisitos" }, { status: 400 })

    const period = currentPeriod()
    const currentEnrollments = profile.enrollments.filter((enrollment) => enrollment.status === "CURSANDO" && enrollment.semesterCode === period)
    const existing = currentEnrollments.find((enrollment) => enrollment.courseId === courseId)
    if (selected && !existing) {
      const credits = currentEnrollments.reduce((total, enrollment) => total + enrollment.course.credits, 0) + course.credits
      if (credits > 18) return NextResponse.json({ error: "No puedes superar 18 créditos en el semestre" }, { status: 400 })
      await prisma.enrollment.create({ data: { studentId: profile.id, courseId, semesterCode: period, status: "CURSANDO" } })
    } else if (!selected && existing) {
      await prisma.enrollment.delete({ where: { id: existing.id } })
    }
    return NextResponse.json({ selected, selectedCredits: currentEnrollments.reduce((total, enrollment) => total + enrollment.course.credits, 0) + (selected && !existing ? course.credits : !selected && existing ? -course.credits : 0) })
  } catch (error) {
    console.error("Error updating course selection:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}