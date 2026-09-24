import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getMeritcoinBalance, resolveCustodialWallet, syncMeritcoinAwardsByStudentId, syncMeritcoinBadges, syncMeritcoinTemplates } from "@/lib/meritcoin"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = session.user.id as string

    // Catálogo de insignias reales de Meritcoin (no requiere wallet).
    // Si su backend está caído, se muestran las ya reflejadas localmente.
    let meritcoinConnected = false
    try {
      const result = await syncMeritcoinTemplates()
      meritcoinConnected = result.connected
    } catch (error) {
      console.error("Error sincronizando plantillas Meritcoin:", error)
    }

    // Reflejar insignias on-chain ganadas por el estudiante.
    // Adaptado a Meritcoin: la llave es meritcoinStudentId (STU-{id}).
    // Si hay STU-x pero no wallet, se resuelve la custodial (lookup + provision) y se guarda.
    // + awards por ID (funciona sin wallet y la auto-importa).
    let meritcoinBalance: number | null = null
    try {
      const walletOwner = await prisma.studentProfile.findUnique({
        where: { userId },
        select: { walletAddress: true, meritcoinStudentId: true },
      })
      if (walletOwner?.meritcoinStudentId && !walletOwner.walletAddress) {
        const resolved = await resolveCustodialWallet(userId, walletOwner.meritcoinStudentId)
        if (resolved) walletOwner.walletAddress = resolved.walletAddress
      }
      if (walletOwner?.meritcoinStudentId) {
        const idResult = await syncMeritcoinAwardsByStudentId(userId, walletOwner.meritcoinStudentId)
        meritcoinConnected = idResult.connected || meritcoinConnected
        // Si se importó la wallet, recargar para el sync por wallet
        if (idResult.walletImported) {
          const refreshed = await prisma.studentProfile.findUnique({
            where: { userId },
            select: { walletAddress: true },
          })
          if (refreshed?.walletAddress) walletOwner.walletAddress = refreshed.walletAddress
        }
      }
      if (walletOwner?.walletAddress) {
        const result = await syncMeritcoinBadges(userId, walletOwner.walletAddress)
        meritcoinConnected = result.connected || meritcoinConnected
        if (result.connected) {
          meritcoinBalance = await getMeritcoinBalance(walletOwner.walletAddress)
        }
      }
    } catch (error) {
      console.error("Error sincronizando insignias Meritcoin:", error)
    }

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
        progress: null,
        earned: !!earned,
        earnedAt: earned?.earnedAt || null,
        evidence: earned?.evidence || null,
        source: earned?.verifiedBy === "MERITCOIN" || badge.externalId?.startsWith("MERIT-") ? "MERITCOIN" : "LOCAL"
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
      },
      meritcoin: { connected: meritcoinConnected, balanceMrt: meritcoinBalance }
    })
  } catch (error) {
    console.error("Error fetching badges:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
