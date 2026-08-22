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

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        program: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    // Calcular estadísticas
    const totalCredits = student.totalCredits
    const averageGrade = student.averageGrade

    // Obtener insignias recientes
    const recentBadges = await prisma.studentBadge.findMany({
      where: { studentId: userId },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
      take: 3
    })

    // Obtener misiones activas
    const activeMissions = await prisma.studentMission.findMany({
      where: {
        studentId: userId,
        status: { in: ["PENDIENTE", "EN_PROGRESO"] }
      },
      include: { mission: true },
      take: 3
    })

    // Obtener notificaciones no leídas
    const unreadNotifications = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    })

    return NextResponse.json({
      student: {
        ...student,
        name: student.user.name,
        email: student.user.email,
        programName: student.program.name
      },
      stats: {
        totalCredits,
        averageGrade,
        level: student.level
      },
      recentBadges,
      activeMissions,
      unreadNotifications
    })
  } catch (error) {
    console.error("Error fetching student data:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
