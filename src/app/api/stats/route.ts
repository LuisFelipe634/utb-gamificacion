import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getCurrentSemester } from "@/lib/academic"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = session.user.id as string

    // Obtener perfil del estudiante
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        program: true,
        enrollments: {
          include: { course: { include: { semester: true } } }
        },
        academicHistory: true
      }
    })

    if (!profile) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    const approvedCredits = Array.from(new Map(
      profile.enrollments
        .filter((enrollment) => enrollment.status === "APROBADO")
        .map((enrollment) => [enrollment.courseId, enrollment.course.credits])
    ).values()).reduce((total, credits) => total + credits, 0)
    const currentSemester = getCurrentSemester(profile.enrollments, profile.currentSemester)

    // Obtener puntos totales
    const points = await prisma.point.groupBy({
      by: ["source"],
      where: { userId },
      _sum: { amount: true },
      _count: true
    })

    const totalPoints = points.reduce((acc, p) => acc + (p._sum.amount || 0), 0)

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

    // Obtener insignias
    const badges = await prisma.studentBadge.findMany({
      where: { studentId: userId }
    })

    // Obtener misiones
    const missions = await prisma.studentMission.findMany({
      where: { studentId: userId },
      include: {
        mission: true
      }
    })

    const completedMissions = missions.filter(
      (m) => m.status === "COMPLETADA" || m.status === "VERIFICADA"
    )

    // Calcular progreso por categoría de cursos
    const enrollmentsByType = profile.enrollments.reduce((acc, e) => {
      const type = e.course.type || "OBLIGATORIO"
      if (!acc[type]) {
        acc[type] = { total: 0, approved: 0, credits: 0, totalCredits: 0 }
      }
      acc[type].total++
      acc[type].totalCredits += e.course.credits
      if (e.status === "APROBADO") {
        acc[type].approved++
        acc[type].credits += e.course.credits
      }
      return acc
    }, {} as Record<string, { total: number; approved: number; credits: number; totalCredits: number }>)

    // Progreso mensual (simulado - en producción vendría de datos históricos)
    const monthlyProgress = [
      { month: "Ene", credits: 12, grade: 4.0 },
      { month: "Feb", credits: 15, grade: 4.1 },
      { month: "Mar", credits: 18, grade: 4.0 },
      { month: "Abr", credits: 22, grade: 4.2 },
      { month: "May", credits: 25, grade: 4.1 },
      { month: "Jun", credits: 28, grade: 4.3 },
      { month: "Jul", credits: 30, grade: 4.2 },
      { month: "Ago", credits: approvedCredits, grade: profile.averageGrade }
    ]

    // Calcular tendencia del promedio
    const gradeTrend = profile.averageGrade - 4.0 // Comparar con semestre anterior

    return NextResponse.json({
      overall: {
        creditsApproved: approvedCredits,
        totalCredits: profile.program.totalCredits,
        averageGrade: profile.averageGrade,
        coursesCompleted: profile.enrollments.filter((e) => e.status === "APROBADO").length,
        totalCourses: profile.enrollments.length,
        currentSemester,
        totalSemesters: profile.program.totalSemesters,
        gradeTrend
      },
      byCategory: Object.entries(enrollmentsByType).map(([category, data]) => ({
        category,
        approved: data.approved,
        total: data.total,
        credits: data.credits,
        totalCredits: data.totalCredits,
        percentage: data.totalCredits > 0
          ? Math.round((data.credits / data.totalCredits) * 100)
          : 0
      })),
      monthlyProgress,
      achievements: {
        totalBadges: await prisma.badge.count({ where: { isActive: true } }),
        earnedBadges: badges.length,
        totalMissions: await prisma.mission.count({ where: { isActive: true } }),
        completedMissions: completedMissions.length,
        totalPoints,
        level: currentLevel?.number || 1,
        levelName: currentLevel?.name || "Novato",
        nextLevel: nextLevel?.name || null,
        nextLevelPoints: nextLevel?.minPoints || 0,
        pointsToNextLevel: nextLevel ? nextLevel.minPoints - totalPoints : 0
      },
      pointsBySource: points.map((p) => ({
        source: p.source,
        total: p._sum.amount || 0,
        count: p._count
      }))
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
