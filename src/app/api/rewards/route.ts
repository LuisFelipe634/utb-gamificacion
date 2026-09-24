import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${now.getMonth() < 6 ? 1 : 2}`
}

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Solo los estudiantes pueden acceder a recompensas" }, { status: 403 })
    }

    const userId = session.user.id as string

    // Obtener puntos totales del estudiante
    const points = await prisma.point.groupBy({
      by: ["source"],
      where: { userId },
      _sum: { amount: true }
    })
    const totalPoints = points.reduce((acc, p) => acc + (p._sum.amount || 0), 0)

    // Obtener todas las recompensas activas
    const rewards = await prisma.reward.findMany({
      where: { isActive: true },
      orderBy: { cost: "asc" }
    })

    // Obtener recompensas canjeadas por el estudiante
    const studentRewards = await prisma.studentReward.findMany({
      where: { studentId: userId },
      include: { reward: true, course: { include: { semester: true } } }
    })

    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        enrollments: {
          where: {
            semesterCode: currentPeriod(),
            status: { in: ["CURSANDO", "INSCRITO"] }
          },
          include: { course: { include: { semester: true } } }
        }
      }
    })
    const enrolledCourses = profile?.enrollments.map((enrollment) => ({
      id: enrollment.course.id,
      code: enrollment.course.code,
      name: enrollment.course.name,
      semester: enrollment.course.semester.number,
      period: enrollment.semesterCode
    })) || []

    // Combinar información
    const rewardsWithStatus = rewards.map((reward) => {
      const earned = studentRewards.find((sr) => sr.rewardId === reward.id)
      const usesCount = studentRewards.filter((sr) => sr.rewardId === reward.id && sr.status !== "RECHAZADO").length
      const canUse = reward.maxUses === null || usesCount < reward.maxUses

      return {
        id: reward.id,
        name: reward.name,
        description: reward.description,
        icon: reward.icon,
        category: reward.category,
        cost: reward.cost,
        maxUses: reward.maxUses,
        canAfford: totalPoints >= reward.cost,
        canUse,
        usesCount,
        earned: earned ? {
          id: earned.id,
          status: earned.status,
          pointsSpent: earned.pointsSpent,
          requestedAt: earned.requestedAt,
          reviewedAt: earned.reviewedAt,
          reviewNote: earned.reviewNote,
          expiresAt: earned.expiresAt,
          course: {
            id: earned.course.id,
            code: earned.course.code,
            name: earned.course.name,
            semester: earned.course.semester.number
          }
        } : null
      }
    })

    // Estadísticas
    const byCategory = rewardsWithStatus.reduce((acc, reward) => {
      if (!acc[reward.category]) {
        acc[reward.category] = { total: 0, available: 0, used: 0 }
      }
      acc[reward.category].total++
      if (reward.canUse && reward.canAfford) acc[reward.category].available++
      if (reward.earned && reward.earned.status === "APROBADO") acc[reward.category].used++
      return acc
    }, {} as Record<string, { total: number; available: number; used: number }>)

    return NextResponse.json({
      rewards: rewardsWithStatus,
      enrolledCourses,
      stats: {
        totalPoints,
        totalRewards: rewards.length,
        availableRewards: rewardsWithStatus.filter(r => r.canUse && r.canAfford).length,
        usedRewards: studentRewards.filter(sr => sr.status === "APROBADO").length,
        byCategory
      }
    })
  } catch (error) {
    console.error("Error fetching rewards:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Solo los estudiantes pueden canjear recompensas" }, { status: 403 })
    }

    const userId = session.user.id as string
    const body = await request.json()
    const { rewardId, courseId, evidence } = body as { rewardId: string; courseId?: string; evidence?: string }

    if (!rewardId || !courseId) {
      return NextResponse.json({ error: "Debes seleccionar el curso objetivo" }, { status: 400 })
    }

    // Verificar que la recompensa existe y está activa
    const reward = await prisma.reward.findUnique({
      where: { id: rewardId }
    })

    if (!reward || !reward.isActive) {
      return NextResponse.json({ error: "Recompensa no encontrada o inactiva" }, { status: 404 })
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        enrollments: {
          where: {
            courseId,
            semesterCode: currentPeriod(),
            status: { in: ["CURSANDO", "INSCRITO"] }
          }
        }
      }
    })
    if (!profile?.enrollments.length) {
      return NextResponse.json({ error: "Solo puedes reclamar la recompensa para un curso que estás cursando" }, { status: 400 })
    }

    // Verificar límite de usos
    const existingUses = await prisma.studentReward.count({
      where: {
        studentId: userId,
        rewardId,
        status: { not: "RECHAZADO" }
      }
    })

    if (reward.maxUses !== null && existingUses >= reward.maxUses) {
      return NextResponse.json({ error: "Has alcanzado el límite de usos para esta recompensa" }, { status: 400 })
    }

    // Verificar puntos suficientes
    const points = await prisma.point.groupBy({
      by: ["source"],
      where: { userId },
      _sum: { amount: true }
    })
    const totalPoints = points.reduce((acc, p) => acc + (p._sum.amount || 0), 0)

    if (totalPoints < reward.cost) {
      return NextResponse.json({ error: "Puntos insuficientes" }, { status: 400 })
    }

    // Verificar si ya tiene una solicitud pendiente para esta recompensa+curso
    const pendingRequest = await prisma.studentReward.findFirst({
      where: {
        studentId: userId,
        rewardId,
        courseId,
        status: "SOLICITADO"
      }
    })

    if (pendingRequest) {
      return NextResponse.json({ error: "Ya tienes una solicitud pendiente para esta recompensa" }, { status: 400 })
    }

    // Crear la solicitud de canje y descontar puntos en una transacción
    const studentReward = await prisma.$transaction(async (tx) => {
      // Descontar puntos (crear registro negativo)
      await tx.point.create({
        data: {
          userId,
          amount: -reward.cost,
          source: "CANJE_RECOMPENSA",
          description: `Canje: ${reward.name}`
        }
      })

      // Crear solicitud de recompensa
      const sr = await tx.studentReward.create({
        data: {
          studentId: userId,
          rewardId,
          courseId,
          status: "SOLICITADO",
          pointsSpent: reward.cost,
          evidence: evidence?.trim() || null,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días para usar
        }
      })

      // Notificar al estudiante
      await tx.notification.create({
        data: {
          userId,
          title: "Recompensa solicitada",
          message: `Tu solicitud para "${reward.name}" ha sido enviada y está pendiente de revisión docente. Se descontaron ${reward.cost} puntos.`,
          type: "INFO",
          link: "/recompensas"
        }
      })

      // Notificar a docentes que tienen al estudiante en sus cursos
      const studentProfile = await tx.studentProfile.findUnique({
        where: { userId },
        include: { enrollments: { include: { course: true } } }
      })
      if (studentProfile) {
        const teacherCourses = await tx.teacherCourse.findMany({
          where: { courseId },
          include: { teacher: true }
        })
        const teacherIds = [...new Set(teacherCourses.map(tc => tc.teacher.userId))]
        for (const teacherId of teacherIds) {
          await tx.notification.create({
            data: {
              userId: teacherId,
              title: "Nueva solicitud de recompensa",
              message: `Un estudiante ha solicitado "${reward.name}" para el curso seleccionado. Revisa en el panel de docentes.`,
              type: "SOLICITUD_RECOMPENSA",
              link: "/docentes"
            }
          })
        }
      }

      return sr
    })

    return NextResponse.json({ studentReward })
  } catch (error) {
    console.error("Error redeeming reward:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}