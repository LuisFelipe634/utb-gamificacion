import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAverageGrade, getCurrentSemester } from "@/lib/academic"
import { auth } from "@/lib/auth"
import { calculateStreak } from "@/lib/streak"

export async function GET() {
  function currentPeriod() {
    const now = new Date()
    return `${now.getFullYear()}-${now.getMonth() < 6 ? 1 : 2}`
  }

  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Esta información es exclusiva para estudiantes" }, { status: 403 })
    }

    const userId = session.user.id as string
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayActivity = await prisma.activity.findFirst({ where: { userId, action: "ACADEMIC_DAILY_ACTIVITY", createdAt: { gte: todayStart } } })
    if (!todayActivity) {
      await prisma.activity.create({ data: { userId, action: "ACADEMIC_DAILY_ACTIVITY", details: { source: "student_profile" } } })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: {
          include: {
            program: true,
            enrollments: {
              include: { course: { include: { semester: true } } }
            },
            academicHistory: true,
            recommendations: true
          }
        },
        points: true,
        missions: {
          include: {
            mission: true
          }
        },
        badges: {
          include: {
            badge: true
          }
        },
        notifications: {
          where: { isRead: false },
          orderBy: { createdAt: "desc" },
          take: 5
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 10
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Calcular puntos totales
    const totalPoints = user.points.reduce((acc, p) => acc + p.amount, 0)
    const streakActivities = await prisma.activity.findMany({ where: { userId, action: "ACADEMIC_DAILY_ACTIVITY" }, select: { createdAt: true }, orderBy: { createdAt: "desc" } })

    // Obtener nivel actual
    const levels = await prisma.level.findMany({
      orderBy: { number: "asc" }
    })

    let currentLevel = levels[0]
    let nextLevel = levels[1]

    for (let i = levels.length - 1; i >= 0; i--) {
      if (totalPoints >= levels[i].minPoints) {
        currentLevel = levels[i]
        nextLevel = levels[i + 1] || null
        break
      }
    }

    // Calcular misiones activas y completadas
    const activeMissions = user.missions.filter(
      (m) => m.status === "EN_PROGRESO" || m.status === "PENDIENTE"
    )
    const completedMissions = user.missions.filter(
      (m) => m.status === "COMPLETADA" || m.status === "VERIFICADA"
    )

    const approvedCredits = Array.from(new Map(
      user.studentProfile?.enrollments
        .filter((enrollment) => enrollment.status === "APROBADO")
        .map((enrollment) => [enrollment.courseId, enrollment.course.credits]) || []
    ).values()).reduce((total, credits) => total + credits, 0)
    const currentSemester = getCurrentSemester(user.studentProfile?.enrollments || [], user.studentProfile?.currentSemester || 1, currentPeriod())
    const averageGrade = user.studentProfile
      ? getAverageGrade(user.studentProfile.academicHistory, user.studentProfile.enrollments, user.studentProfile.averageGrade)
      : 0

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      profile: user.studentProfile ? { ...user.studentProfile, averageGrade, currentSemester, totalCredits: approvedCredits } : null,
      stats: {
        totalPoints,
        currentLevel: currentLevel?.name || "Novato",
        currentLevelNumber: currentLevel?.number || 1,
        nextLevel: nextLevel?.name || null,
        nextLevelPoints: nextLevel?.minPoints || 0,
        pointsToNextLevel: nextLevel ? nextLevel.minPoints - totalPoints : 0,
        activeMissionsCount: activeMissions.length,
        completedMissionsCount: completedMissions.length,
        badgesCount: user.badges.length,
        streak: calculateStreak(streakActivities)
      },
      missions: user.missions.map((m) => ({
        id: m.id,
        title: m.mission.title,
        description: m.mission.description,
        type: m.mission.type,
        points: m.mission.pointsReward,
        progress: m.progress,
        status: m.status,
        completedAt: m.completedAt
      })),
      recentBadges: user.badges.slice(0, 5).map((b) => ({
        id: b.badge.id,
        name: b.badge.name,
        icon: b.badge.iconUrl,
        earned: b.earnedAt
      })),
      notifications: user.notifications,
      unreadCount: await prisma.notification.count({
        where: {
          userId: user.id as string,
          isRead: false
        }
      })
    })
  } catch (error) {
    console.error("Error fetching student data:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PATCH: Actualizar el vínculo con Meritcoin del estudiante
// (wallet Ethereum y/o ID de estudiante en Meritcoin/Moodle)
export async function PATCH(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Solo los estudiantes pueden actualizar su vínculo Meritcoin" }, { status: 403 })
    }

    const body = await request.json()
    const { walletAddress, meritcoinStudentId } = body as { walletAddress?: unknown; meritcoinStudentId?: unknown }

    if (walletAddress !== undefined && walletAddress !== null && walletAddress !== "") {
      if (typeof walletAddress !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim())) {
        return NextResponse.json({ error: "Dirección de wallet inválida (formato 0x + 40 caracteres hexadecimales)" }, { status: 400 })
      }
    }

    if (meritcoinStudentId !== undefined && meritcoinStudentId !== null && meritcoinStudentId !== "") {
      if (typeof meritcoinStudentId !== "string" || meritcoinStudentId.trim().length > 100) {
        return NextResponse.json({ error: "ID de Meritcoin inválido" }, { status: 400 })
      }
    }

    const data: { walletAddress?: string | null; meritcoinStudentId?: string | null } = {}
    if (walletAddress !== undefined) data.walletAddress = !walletAddress ? null : (walletAddress as string).trim()
    if (meritcoinStudentId !== undefined) {
      data.meritcoinStudentId = !meritcoinStudentId ? null : (meritcoinStudentId as string).trim()
    }

    const profile = await prisma.studentProfile.update({
      where: { userId: session.user.id as string },
      data,
      select: { walletAddress: true, meritcoinStudentId: true },
    })

    return NextResponse.json({ walletAddress: profile.walletAddress, meritcoinStudentId: profile.meritcoinStudentId })
  } catch (error) {
    console.error("Error updating wallet:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
