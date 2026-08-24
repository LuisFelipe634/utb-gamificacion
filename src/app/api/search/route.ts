import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function normalizeSearchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

function matchesSearch(query: string, ...values: string[]) {
  const normalizedQuery = normalizeSearchText(query)
  return values.some((value) => normalizeSearchText(value).includes(normalizedQuery))
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() || ""
  if (query.length < 2) return NextResponse.json({ results: [] })

  try {
    const userId = session.user.id
    const isTeacher = session.user.role === "TEACHER"
    const results: { id: string; type: string; title: string; description: string; href: string }[] = []

    if (isTeacher) {
      const students = await prisma.user.findMany({
        where: {
          role: "STUDENT"
        },
        select: { id: true, name: true, email: true, studentProfile: { select: { studentCode: true } } },
        orderBy: { name: "asc" },
        take: 100
      })

      results.push(...students.filter((student) => matchesSearch(query, student.name, student.email, student.studentProfile?.studentCode || "")).slice(0, 8).map((student) => ({
        id: student.id,
        type: "student",
        title: student.name,
        description: student.email,
        href: `/docentes?student=${student.id}`
      })))
    } else {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId },
        select: { programId: true, level: true }
      })

      if (!profile) return NextResponse.json({ results: [] })

      const [courses, missions, badges, notifications, recommendations] = await Promise.all([
        prisma.course.findMany({
          where: {
            programId: profile.programId,
            isActive: true
          },
          select: { id: true, code: true, name: true },
          orderBy: { name: "asc" },
          take: 100
        }),
        prisma.mission.findMany({
          where: {
            isActive: true,
            OR: [{ requiredLevel: null }, { requiredLevel: { lte: profile.level } }]
          },
          select: { id: true, title: true, description: true },
          orderBy: { title: "asc" },
          take: 100
        }),
        prisma.badge.findMany({
          where: { isActive: true },
          select: { id: true, name: true, description: true },
          orderBy: { name: "asc" },
          take: 100
        }),
        prisma.notification.findMany({
          where: { userId },
          select: { id: true, title: true, message: true },
          orderBy: { createdAt: "desc" },
          take: 100
        }),
        prisma.recommendation.findMany({
          where: { studentId: userId },
          select: { id: true, title: true, description: true },
          orderBy: { createdAt: "desc" },
          take: 8
        })
      ])

      results.push(
        ...courses.filter((course) => matchesSearch(query, course.code, course.name)).slice(0, 8).map((course) => ({ id: course.id, type: "course", title: course.name, description: course.code, href: `/malla?course=${course.id}` })),
        ...missions.filter((mission) => matchesSearch(query, mission.title, mission.description)).slice(0, 8).map((mission) => ({ id: mission.id, type: "mission", title: mission.title, description: mission.description, href: `/misiones?mission=${mission.id}` })),
        ...badges.filter((badge) => matchesSearch(query, badge.name, badge.description)).slice(0, 8).map((badge) => ({ id: badge.id, type: "badge", title: badge.name, description: badge.description, href: `/logros?badge=${badge.id}` })),
        ...notifications.filter((notification) => matchesSearch(query, notification.title, notification.message)).slice(0, 8).map((notification) => ({ id: notification.id, type: "notification", title: notification.title, description: notification.message, href: `/notificaciones?notification=${notification.id}` })),
        ...recommendations.filter((recommendation) => matchesSearch(query, recommendation.title, recommendation.description)).slice(0, 8).map((recommendation) => ({ id: recommendation.id, type: "recommendation", title: recommendation.title, description: recommendation.description, href: "/malla" }))
      )
    }

    return NextResponse.json({ results: results.slice(0, 12) })
  } catch (error) {
    console.error("Error searching application data:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
