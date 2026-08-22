import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (session.user.role !== "COORDINATOR") {
    return NextResponse.json({ error: "Acceso exclusivo para coordinadores" }, { status: 403 })
  }

  try {
    const coordinator = await prisma.coordinatorProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        program: {
          include: {
            courses: { include: { semester: true } },
            students: {
              include: {
                user: { include: { badges: { include: { badge: true }, orderBy: { earnedAt: "desc" } } } },
                enrollments: { include: { course: true } }
              },
              orderBy: { user: { name: "asc" } }
            }
          }
        }
      }
    })

    if (!coordinator) {
      return NextResponse.json({ error: "Perfil de coordinador no encontrado" }, { status: 404 })
    }

    const { program } = coordinator
    const students = program.students.map((student) => ({
      id: student.userId,
      name: student.user.name,
      code: student.studentCode,
      semester: student.currentSemester,
      averageGrade: student.averageGrade,
      credits: student.totalCredits,
      badges: student.user.badges.length,
      status: student.averageGrade < 3 ? "Atención prioritaria" : "En seguimiento"
    }))
    const levelIndicators = Array.from({ length: program.totalSemesters }, (_, index) => {
      const semester = index + 1
      const levelStudents = program.students.filter((student) => student.currentSemester === semester)
      return {
        level: semester,
        students: levelStudents.length,
        averageCredits: levelStudents.length
          ? Math.round(levelStudents.reduce((total, student) => total + student.totalCredits, 0) / levelStudents.length)
          : 0
      }
    })

    return NextResponse.json({
      program: { id: program.id, code: program.code, name: program.name, version: program.version, totalCredits: program.totalCredits, totalSemesters: program.totalSemesters },
      indicators: {
        students: students.length,
        averageCredits: students.length ? Math.round(students.reduce((total, student) => total + student.credits, 0) / students.length) : 0,
        averageGrade: students.length ? Number((students.reduce((total, student) => total + student.averageGrade, 0) / students.length).toFixed(1)) : 0,
        atRisk: students.filter((student) => student.status === "Atención prioritaria").length,
        levelIndicators
      },
      courses: program.courses.sort((first, second) => first.semester.number - second.semester.number).map((course) => ({ code: course.code, name: course.name, credits: course.credits, semester: course.semester.number, type: course.type })),
      students
    })
  } catch (error) {
    console.error("Error fetching coordinator data:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}