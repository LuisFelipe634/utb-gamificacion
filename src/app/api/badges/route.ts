import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = session.user.id as string

    // Obtener todas las insignias disponibles
    const allBadges = await prisma.badge.findMany({
      where: { isActive: true },
      orderBy: { category: "asc" }
    })

    // Obtener insignias que tiene el estudiante
    const earnedBadges = await prisma.studentBadge.findMany({
      where: { studentId: userId },
      include: {
        badge: true
      }
    })

    const earnedBadgeIds = earnedBadges.map((eb) => eb.badgeId)

    // Combinar información
    const badges = allBadges.map((badge) => {
      const earned = earnedBadges.find((eb) =>eb.badgeId === badge.id)

      return {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.iconUrl,
        category: badge.category,
        requiredLevel: badge.requiredLevel,
        pointsRequired: badge.pointsRequired,
        earned: !!earned,
        earnedAt: earned?.earnedAt || null,
        evidence: earned?.evidence || null
      }
    })

    // Estadísticas
    const totalBadges = badges.length
    const earnedCount = badges.filter((b) => b.earned).length
    const byCategory = badges.reduce((acc, badge) => {
      if (!acc[badge.category]) {
        acc[badge.category] = { total: 0, earned: 0 }
      }
      acc[badge.category].total++
      if (badge.earned) acc[badge.category].earned++
      return acc
    }, {} as Record<string, { total: number; earned: number }>)

    return NextResponse.json({
      badges,
      stats: {
        total: totalBadges,
        earned: earnedCount,
        percentage: totalBadges > 0 ? Math.round((earnedCount / totalBadges) * 100) : 0,
        byCategory
      }
    })
  } catch (error) {
    console.error("Error fetching badges:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
