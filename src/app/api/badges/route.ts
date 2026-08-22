import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = session.user.id

    // Obtener todas las insignias disponibles
    const allBadges = await prisma.badge.findMany({
      where: { isActive: true },
      orderBy: { category: "asc" }
    })

    // Obtener las insignias del estudiante
    const studentBadges = await prisma.studentBadge.findMany({
      where: { studentId: userId },
      include: { badge: true }
    })

    // Combinar datos
    const badgesWithStatus = allBadges.map((badge) => {
      const earned = studentBadges.find((sb) => sb.badgeId === badge.id)
      return {
        ...badge,
        earned: !!earned,
        earnedAt: earned?.earnedAt || null,
        evidence: earned?.evidence || null
      }
    })

    return NextResponse.json({ badges: badgesWithStatus })
  } catch (error) {
    console.error("Error fetching badges:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
