import { calculateStreak } from "@/lib/streak"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getAverageGrade, getCurrentSemester } from "@/lib/academic"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Acceso exclusivo para docentes" }, { status: 403 })
  }

  try {
    const teacher = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        teacherProfile: {
          include: {
            assignedCourses: { include: { course: { include: { semester: true } } } }
          }
        }
      }
    })
    const assignedCourses = teacher?.teacherProfile?.assignedCourses || []
    const assignedCourseIds = assignedCourses.map((assignment) => assignment.courseId)
    const assignedPeriods = [...new Set(assignedCourses.map((assignment) => assignment.period))]

    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        studentProfile: {
          is: {
            enrollments: {
              some: {
                courseId: { in: assignedCourseIds },
                status: { in: ["CURSANDO", "INSCRITO"] as const },
                ...(assignedPeriods.length ? { semesterCode: { in: assignedPeriods } } : {}),
              },
            },
          }
        }
      },
      orderBy: { name: "asc" },
      include: {
        studentProfile: {
          include: {
            program: { include: { courses: { include: { semester: true, prerequisites: { include: { prerequisite: true } } } } } },
            enrollments: { include: { course: { include: { semester: true } } } },
            academicHistory: true,
            recommendations: { orderBy: { priority: "asc" }, take: 3 }
          }
        },
        badges: { include: { badge: true }, orderBy: { earnedAt: "desc" } },
        missions: { where: { status: "EN_REVISION" }, include: { mission: true }, orderBy: { completedAt: "asc" } }
      }
    })

    const streakActivities = await prisma.activity.findMany({
      where: { userId: { in: students.map((student) => student.id) }, action: "ACADEMIC_DAILY_ACTIVITY" },
      select: { userId: true, createdAt: true },
      orderBy: { createdAt: "desc" }
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

      const period = assignedPeriods[0] || undefined
      const currentSemester = getCurrentSemester(profile.enrollments, profile.currentSemester, period)
      const averageGrade = getAverageGrade(profile.academicHistory, profile.enrollments, profile.averageGrade)
      const approvedCredits = Array.from(new Map(profile.enrollments.filter((enrollment) => enrollment.status === "APROBADO").map((enrollment) => [enrollment.courseId, enrollment.course.credits])).values()).reduce((total, credits) => total + credits, 0)
      const academicRisk = averageGrade < 3 ? "Requiere acompañamiento por promedio bajo" :
        approvedCredits < currentSemester * 12 ? "Avance de créditos por debajo de lo esperado" : null

      return [{
        id: student.id,
        name: student.name,
        email: student.email,
        studentCode: profile.studentCode,
        program: profile.program.name,
        semester: currentSemester,
        averageGrade,
        totalCredits: approvedCredits,
        totalProgramCredits: profile.program.totalCredits,
        completedCourses: profile.enrollments.filter((enrollment) => enrollment.status === "APROBADO").length,
        currentCourses: profile.enrollments.filter((enrollment) => enrollment.status === "CURSANDO").map((enrollment) => ({ code: enrollment.course.code, name: enrollment.course.name, credits: enrollment.course.credits, period: enrollment.semesterCode })),
        badges: student.badges.map(({ badge, earnedAt, evidence }) => ({ name: badge.name, icon: badge.iconUrl, category: badge.category, earnedAt, evidence })),
        recommendations: profile.recommendations.map(({ title, description, priority }) => ({ title, description, priority })),
        suggestedCourses: suggestedCourses.map((course) => ({ code: course.code, name: course.name, credits: course.credits, semester: course.semester.number })),
        streak: calculateStreak(streakActivities.filter((activity) => activity.userId === student.id)),
        risk: academicRisk,
        pendingMissions: student.missions.map(({ id, mission, evidence, completedAt, status }) => ({ id, title: mission.title, description: mission.description, points: mission.pointsReward, evidence, completedAt, status }))
        ,assignedCourseIds: profile.enrollments.filter((enrollment) => assignedCourseIds.includes(enrollment.courseId) && ["CURSANDO","INSCRITO"].includes(enrollment.status) && (assignedPeriods.length === 0 || assignedPeriods.includes(enrollment.semesterCode))).map((enrollment) => enrollment.courseId)
      }]
    })

    const courses = assignedCourses.map((assignment) => ({
      id: assignment.course.id,
      code: assignment.course.code,
      name: assignment.course.name,
      semester: assignment.course.semester.number,
      period: assignment.period,
      students: data.filter((student) => student.assignedCourseIds.includes(assignment.courseId)).map((student) => ({
        id: student.id,
        name: student.name,
        studentCode: student.studentCode,
        averageGrade: student.averageGrade,
        totalCredits: student.totalCredits
      }))
    }))

    return NextResponse.json({
      teacher: teacher ? {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        profile: teacher.teacherProfile
      } : null,
      courses,
      students: data,
      pendingMissions: data.flatMap((student) => student.pendingMissions.map((mission) => ({ ...mission, studentId: student.id, studentName: student.name, studentCode: student.studentCode })))
    })
  } catch (error) {
    console.error("Error fetching teacher data:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Acceso exclusivo para docentes" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { studentMissionId, decision, comment } = body
    if (!studentMissionId || !["approve", "reject"].includes(decision)) {
      return NextResponse.json({ error: "Decisión de revisión inválida" }, { status: 400 })
    }

    const studentMission = await prisma.studentMission.findUnique({
      where: { id: studentMissionId },
      include: { mission: true, student: true }
    })
    if (!studentMission || studentMission.status !== "EN_REVISION") {
      return NextResponse.json({ error: "La misión no está pendiente de revisión" }, { status: 400 })
    }

    const approved = decision === "approve"
    await prisma.$transaction(async (transaction) => {
      await transaction.studentMission.update({
        where: { id: studentMissionId },
        data: {
          status: approved ? "VERIFICADA" : "RECHAZADA",
          verifiedBy: session.user.id,
          verifiedAt: new Date(),
          reviewComment: typeof comment === "string" ? comment.trim() || null : null
        }
      })

      if (approved) {
        await transaction.point.create({
          data: { userId: studentMission.studentId, amount: studentMission.mission.pointsReward, source: "MISION_COMPLETADA", description: `Misión verificada: ${studentMission.mission.title}` }
        })
        await transaction.activity.create({
          data: { userId: studentMission.studentId, action: "MISION_VERIFICADA", details: { missionId: studentMission.missionId, reviewedBy: session.user.id, pointsEarned: studentMission.mission.pointsReward } }
        })
      }

      await transaction.notification.create({
        data: {
          userId: studentMission.studentId,
          title: approved ? "Misión verificada" : "Misión devuelta para revisión",
          message: approved ? `Tu misión «${studentMission.mission.title}» fue aprobada y ganaste ${studentMission.mission.pointsReward} puntos.` : `Tu misión «${studentMission.mission.title}» necesita ajustes.${typeof comment === "string" && comment.trim() ? ` Comentario: ${comment.trim()}` : ""}`,
          type: approved ? "LOGRO_OBTENIDO" : "WARNING",
          link: "/misiones"
        }
      })
    })

    return NextResponse.json({ success: true, status: approved ? "VERIFICADA" : "RECHAZADA" })
  } catch (error) {
    console.error("Error reviewing mission:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}