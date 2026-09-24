import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCreditLimit, getCurrentSemester } from "@/lib/academic"

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
    const currentSemester = getCurrentSemester(profile.enrollments, profile.currentSemester, period)
    // Precedencia determinista cuando un curso tiene varias inscripciones:
    // APROBADO > CURSANDO del periodo vigente > CURSANDO de otro periodo > REPROBADO > resto
    const rankEnrollment = (status: string, semesterCode: string) =>
      status === "APROBADO" ? 0 :
      status === "CURSANDO" && semesterCode === period ? 1 :
      status === "CURSANDO" ? 2 :
      status === "REPROBADO" ? 3 : 4
    const enrollmentByCourse = new Map<string, (typeof profile.enrollments)[number]>()
    for (const enrollment of profile.enrollments) {
      const current = enrollmentByCourse.get(enrollment.courseId)
      if (!current || rankEnrollment(enrollment.status, enrollment.semesterCode) < rankEnrollment(current.status, current.semesterCode)) {
        enrollmentByCourse.set(enrollment.courseId, enrollment)
      }
    }
    const approvedIds = new Set(profile.enrollments.filter((enrollment) => enrollment.status === "APROBADO").map((enrollment) => enrollment.courseId))
    const selectedIds = new Set(
      profile.enrollments
        .filter((enrollment) => enrollment.status === "CURSANDO" && enrollment.semesterCode === period && enrollment.course.semester?.number === currentSemester)
        .map((enrollment) => enrollment.courseId)
    )
    const selectedCredits = profile.enrollments
      .filter((enrollment) => enrollment.status === "CURSANDO" && enrollment.semesterCode === period && enrollment.course.semester?.number === currentSemester)
      .reduce((total, enrollment) => total + enrollment.course.credits, 0)

    const creditLimit = getCreditLimit(profile.averageGrade)

    // Promedio ponderado por créditos (mismo método que averageGrade del perfil)
    const gradesBySemester = new Map<number, { weightedSum: number; credits: number }>()
    for (const enrollment of profile.enrollments) {
      if (enrollment.status === "APROBADO" && enrollment.grade != null && enrollment.course.semester && enrollment.course.credits > 0) {
        const sem = enrollment.course.semester.number
        const entry = gradesBySemester.get(sem) || { weightedSum: 0, credits: 0 }
        entry.weightedSum += enrollment.grade * enrollment.course.credits
        entry.credits += enrollment.course.credits
        gradesBySemester.set(sem, entry)
      }
    }

    const semesters = profile.program.semesters.map((semester) => {
      const entry = gradesBySemester.get(semester.number)
      const semesterAverage = entry && entry.credits > 0 ? Math.round((entry.weightedSum / entry.credits) * 100) / 100 : null
      const courses = semester.courses.map((course) => {
        const enrollment = enrollmentByCourse.get(course.id)
        const status = enrollment?.status === "APROBADO" ? "completed" :
          enrollment?.status === "CURSANDO" ? "in_progress" :
            enrollment?.status === "REPROBADO" ? "available" : "blocked"
        const prerequisitesMet = course.prerequisites.every(({ prerequisite }) => approvedIds.has(prerequisite.id))
        const missingPrerequisites = course.prerequisites
          .filter(({ prerequisite }) => !approvedIds.has(prerequisite.id))
          .map(({ prerequisite }) => `${prerequisite.code} - ${prerequisite.name}`)
        return { id: course.id, code: course.code, name: course.name, credits: course.credits, status: status === "blocked" && prerequisitesMet ? "available" : status, grade: enrollment?.grade ?? null, selected: selectedIds.has(course.id), source: enrollment?.source ?? null, inCurrentPeriod: enrollment ? enrollment.semesterCode === period : false, prerequisitesMet, missingPrerequisites }
      })
      const completedCredits = courses
        .filter((course) => course.status === "completed")
        .reduce((total, course) => total + course.credits, 0)
      const inProgressCredits = courses
        .filter((course) => course.status === "in_progress" && course.inCurrentPeriod)
        .reduce((total, course) => total + course.credits, 0)

      return {
        semester: semester.number,
        name: semester.name,
        semesterAverage,
        completedCredits,
        inProgressCredits,
        courses
      }
    })

    return NextResponse.json({ program: { name: profile.program.name, code: profile.program.code, version: profile.program.version }, period, currentSemester, selectedCredits, creditLimit, semesters })
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
    const profile = await prisma.studentProfile.findUnique({ where: { userId: session.user.id }, include: { enrollments: { include: { course: { include: { semester: true } } } }, program: true } })
    const course = await prisma.course.findUnique({ where: { id: courseId }, include: { prerequisites: { include: { prerequisite: true } } } })
    if (!profile || !course || course.programId !== profile.programId) return NextResponse.json({ error: "Curso no disponible" }, { status: 404 })
    if (profile.enrollments.some((enrollment) => enrollment.courseId === courseId && enrollment.status === "APROBADO")) return NextResponse.json({ error: "El curso ya fue aprobado" }, { status: 400 })

    const approvedIds = new Set(profile.enrollments.filter((enrollment) => enrollment.status === "APROBADO").map((enrollment) => enrollment.courseId))
    if (!course.prerequisites.every(({ prerequisite }) => approvedIds.has(prerequisite.id))) return NextResponse.json({ error: "Aún no cumples los prerrequisitos" }, { status: 400 })

    const period = currentPeriod()
    const currentSemester = getCurrentSemester(profile.enrollments, profile.currentSemester, period)
    const currentEnrollments = profile.enrollments.filter((enrollment) => enrollment.status === "CURSANDO" && enrollment.semesterCode === period && enrollment.course.semester?.number === currentSemester)
    const existing = currentEnrollments.find((enrollment) => enrollment.courseId === courseId)
    // Inscripción del periodo vigente en cualquier estado (para no violar @@unique)
    const periodEnrollment = profile.enrollments.find((enrollment) => enrollment.courseId === courseId && enrollment.semesterCode === period && enrollment.status !== "APROBADO")

    const creditLimit = getCreditLimit(profile.averageGrade)

    if (selected && !existing) {
      const credits = currentEnrollments.reduce((total, enrollment) => total + enrollment.course.credits, 0) + course.credits
      if (credits > creditLimit) return NextResponse.json({ error: `No puedes superar ${creditLimit} créditos en el semestre` }, { status: 400 })
      if (periodEnrollment) {
        // Ya existe inscripción del periodo (ej. INSCRITO): actualizar a CURSANDO en vez de crear duplicado
        await prisma.enrollment.update({ where: { id: periodEnrollment.id }, data: { status: "CURSANDO" } })
      } else {
        await prisma.enrollment.create({ data: { studentId: profile.id, courseId, semesterCode: period, status: "CURSANDO", source: "MANUAL" } })
      }
    } else if (!selected && existing) {
      // Solo permitir quitar si la inscripción fue creada manualmente (source: MANUAL)
      const enrollmentRecord = await prisma.enrollment.findUnique({ where: { id: existing.id }, select: { source: true } })
      if (!enrollmentRecord || enrollmentRecord.source !== "MANUAL") {
        return NextResponse.json({ error: "No se pueden quitar materias que ya estás cursando (provienen de la universidad)" }, { status: 400 })
      }
      await prisma.enrollment.delete({ where: { id: existing.id } })
    } else if (!selected && !existing) {
      // Limpieza de manuales de periodos anteriores: permitir quitarlas aunque ya no estén vigentes
      const staleManual = profile.enrollments.find((enrollment) => enrollment.courseId === courseId && enrollment.source === "MANUAL" && enrollment.status !== "APROBADO")
      if (staleManual) {
        await prisma.enrollment.delete({ where: { id: staleManual.id } })
      }
    }

    return NextResponse.json({ selected, selectedCredits: currentEnrollments.reduce((total, enrollment) => total + enrollment.course.credits, 0) + (selected && !existing ? course.credits : !selected && existing ? -course.credits : 0), creditLimit })
  } catch (error) {
    console.error("Error updating course selection:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}