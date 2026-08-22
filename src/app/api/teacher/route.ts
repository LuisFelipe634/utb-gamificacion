import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Acceso exclusivo para docentes" }, { status: 403 })
  }

  try {
    const students = await prisma.user.findMany({
      where: { role: "STUDENT", studentProfile: { isNot: null } },
      orderBy: { name: "asc" },
      include: {
        studentProfile: {
          include: {
            program: { include: { courses: { include: { semester: true, prerequisites: { include: { prerequisite: true } } } } } },
            enrollments: { include: { course: true } },
            academicHistory: true,
            recommendations: { orderBy: { priority: "asc" }, take: 3 }
          }
        },
        badges: { include: { badge: true }, orderBy: { earnedAt: "desc" } }
      }
    })

    const data = students.flatMap((student) => {
      const profile = student.studentProfile
      if (!profile) return []

      const approvedCodes = new Set(
        profile.enrollments.filter((enrollment) => enrollment.status === "APROBADO").map((enrollment) => enrollment.course.code)
      )
      const suggestedCourses = profile.program.courses
        .filter((course) => !approvedCodes.has(course.code))
        .filter((course) => course.prerequisites.every(({ prerequisite }) => approvedCodes.has(prerequisite.code)))
        .sort((first, second) => first.semester.number - second.semester.number)
        .slice(0, 3)

      const risk = profile.averageGrade < 3 ? "Requiere acompañamiento por promedio bajo" :
        profile.totalCredits < profile.currentSemester * 12 ? "Avance de créditos por debajo de lo esperado" : null

      return [{
        id: student.id,
        name: student.name,
        email: student.email,
        studentCode: profile.studentCode,
        program: profile.program.name,
        semester: profile.currentSemester,
        averageGrade: profile.averageGrade,
        totalCredits: profile.totalCredits,
        totalProgramCredits: profile.program.totalCredits,
        completedCourses: profile.enrollments.filter((enrollment) => enrollment.status === "APROBADO").length,
        badges: student.badges.map(({ badge, earnedAt, evidence }) => ({ name: badge.name, icon: badge.iconUrl, category: badge.category, earnedAt, evidence })),
        recommendations: profile.recommendations.map(({ title, description, priority }) => ({ title, description, priority })),
        suggestedCourses: suggestedCourses.map((course) => ({ code: course.code, name: course.name, credits: course.credits, semester: course.semester.number })),
        risk
      }]
    })

    return NextResponse.json({ students: data })
  } catch (error) {
    console.error("Error fetching teacher data:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}