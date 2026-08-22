import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
        program: { include: { semesters: { include: { courses: true }, orderBy: { number: "asc" } } } },
        enrollments: { include: { course: true } }
      }
    })

    if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })

    const enrollmentByCourse = new Map(profile.enrollments.map((enrollment) => [enrollment.courseId, enrollment]))
    const semesters = profile.program.semesters.map((semester) => ({
      semester: semester.number,
      name: semester.name,
      courses: semester.courses.map((course) => {
        const enrollment = enrollmentByCourse.get(course.id)
        const status = enrollment?.status === "APROBADO" ? "completed" :
          enrollment?.status === "CURSANDO" ? "in_progress" :
            enrollment?.status === "REPROBADO" ? "available" : "blocked"
        return { code: course.code, name: course.name, credits: course.credits, status, grade: enrollment?.grade ?? null }
      })
    }))

    return NextResponse.json({ program: { name: profile.program.name, code: profile.program.code, version: profile.program.version }, semesters })
  } catch (error) {
    console.error("Error fetching curriculum:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}