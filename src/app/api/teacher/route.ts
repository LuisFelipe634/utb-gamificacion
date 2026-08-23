import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentSemester } from "@/lib/academic"

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
            enrollments: { include: { course: { include: { semester: true } } } },
            academicHistory: true,
            recommendations: { orderBy: { priority: "asc" }, take: 3 }
          }
        },
        badges: { include: { badge: true }, orderBy: { earnedAt: "desc" } },
        missions: { where: { status: "EN_REVISION" }, include: { mission: true }, orderBy: { completedAt: "asc" } }
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

      const currentSemester = getCurrentSemester(profile.enrollments, profile.currentSemester)
      const approvedCredits = Array.from(new Map(profile.enrollments.filter((enrollment) => enrollment.status === "APROBADO").map((enrollment) => [enrollment.courseId, enrollment.course.credits])).values()).reduce((total, credits) => total + credits, 0)
      const academicRisk = profile.averageGrade < 3 ? "Requiere acompañamiento por promedio bajo" :
        approvedCredits < currentSemester * 12 ? "Avance de créditos por debajo de lo esperado" : null

      return [{
        id: student.id,
        name: student.name,
        email: student.email,
        studentCode: profile.studentCode,
        program: profile.program.name,
        semester: currentSemester,
        averageGrade: profile.averageGrade,
        totalCredits: approvedCredits,
        totalProgramCredits: profile.program.totalCredits,
        completedCourses: profile.enrollments.filter((enrollment) => enrollment.status === "APROBADO").length,
        currentCourses: profile.enrollments.filter((enrollment) => enrollment.status === "CURSANDO").map((enrollment) => ({ code: enrollment.course.code, name: enrollment.course.name, credits: enrollment.course.credits, period: enrollment.semesterCode })),
        badges: student.badges.map(({ badge, earnedAt, evidence }) => ({ name: badge.name, icon: badge.iconUrl, category: badge.category, earnedAt, evidence })),
        recommendations: profile.recommendations.map(({ title, description, priority }) => ({ title, description, priority })),
        suggestedCourses: suggestedCourses.map((course) => ({ code: course.code, name: course.name, credits: course.credits, semester: course.semester.number })),
        risk: academicRisk,
        pendingMissions: student.missions.map(({ id, mission, evidence, completedAt, status }) => ({ id, title: mission.title, description: mission.description, points: mission.pointsReward, evidence, completedAt, status }))
      }]
    })

    return NextResponse.json({
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

    if (approved) await awardEligibleBadges(studentMission.studentId)

    return NextResponse.json({ success: true, status: approved ? "VERIFICADA" : "RECHAZADA" })
  } catch (error) {
    console.error("Error reviewing mission:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

async function awardEligibleBadges(userId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: { enrollments: true }
  })
  if (!profile) return

  const [badges, earnedBadges] = await Promise.all([
    prisma.badge.findMany({ where: { isActive: true } }),
    prisma.studentBadge.findMany({ where: { studentId: userId } })
  ])
  const earnedIds = new Set(earnedBadges.map((badge) => badge.badgeId))
  const approvedCourses = profile.enrollments.filter((enrollment) => enrollment.status === "APROBADO").length

  for (const badge of badges) {
    const earned = badge.name === "Excelencia" && profile.averageGrade >= 4.5 ||
      badge.name === "Explorador" && profile.currentSemester > 1 ||
      badge.name === "Velocista" && approvedCourses >= 5
    if (!earned || earnedIds.has(badge.id)) continue

    await prisma.studentBadge.create({ data: { studentId: userId, badgeId: badge.id } })
    await prisma.notification.create({
      data: {
        userId,
        title: "Nueva insignia desbloqueada",
        message: `Has obtenido la insignia: ${badge.name}`,
        type: "LOGRO_OBTENIDO",
        link: "/logros"
      }
    })
  }
}