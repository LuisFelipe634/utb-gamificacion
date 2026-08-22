import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Esta información es exclusiva para estudiantes" }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id as string },
      include: {
        studentProfile: {
          include: {
            program: true,
            enrollments: {
              include: {
                course: true
              }
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

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      profile: user.studentProfile,
      stats: {
        totalPoints,
        currentLevel: currentLevel?.name || "Novato",
        currentLevelNumber: currentLevel?.number || 1,
        nextLevel: nextLevel?.name || null,
        nextLevelPoints: nextLevel?.minPoints || 0,
        pointsToNextLevel: nextLevel ? nextLevel.minPoints - totalPoints : 0,
        activeMissionsCount: activeMissions.length,
        completedMissionsCount: completedMissions.length,
        badgesCount: user.badges.length
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
