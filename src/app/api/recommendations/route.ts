import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { generateRecommendations } from "@/lib/recommendations"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = session.user.id as string

    // Get the student profile
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
    })

    if (!profile) {
      return NextResponse.json({ error: "Perfil de estudiante no encontrado" }, { status: 404 })
    }

    // Generate fresh recommendations
    await generateRecommendations(profile.id)

    // Fetch active (unread) recommendations sorted by priority
    const recommendations = await prisma.recommendation.findMany({
      where: {
        studentId: profile.id,
        isRead: false,
      },
      orderBy: [
        { priority: "asc" },
        { createdAt: "desc" },
      ],
      take: 5,
    })

    return NextResponse.json(recommendations)
  } catch (error) {
    console.error("Error fetching recommendations:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PATCH: Mark a recommendation as read (dismissed)
export async function PATCH(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { recommendationId } = body

    if (!recommendationId) {
      return NextResponse.json({ error: "ID de recomendación requerido" }, { status: 400 })
    }

    await prisma.recommendation.update({
      where: { id: recommendationId },
      data: { isRead: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating recommendation:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
