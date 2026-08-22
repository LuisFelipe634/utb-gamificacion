import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET: Obtener misiones del estudiante
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = session.user.id as string

    // Obtener perfil del estudiante
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId }
    })

    if (!studentProfile) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    // Obtener misiones disponibles (activas y con nivel adecuado)
    const availableMissions = await prisma.mission.findMany({
      where: {
        isActive: true,
        OR: [
          { requiredLevel: null },
          { requiredLevel: { lte: studentProfile.level } }
        ]
      },
      include: {
        course: true
      }
    })

    // Obtener misiones del estudiante
    const studentMissions = await prisma.studentMission.findMany({
      where: { studentId: userId },
      include: {
        mission: true
      }
    })

    // Combinar misiones disponibles con el estado del estudiante
    const missions = availableMissions.map((mission) => {
      const studentMission = studentMissions.find(
        (sm) => sm.missionId === mission.id
      )

      return {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        type: mission.type,
        points: mission.pointsReward,
        requiredLevel: mission.requiredLevel,
        startDate: mission.startDate,
        endDate: mission.endDate,
        course: mission.course ? {
          id: mission.course.id,
          name: mission.course.name,
          code: mission.course.code
        } : null,
        // Estado del estudiante en esta misión
        studentMissionId: studentMission?.id || null,
        status: studentMission?.status || "NO_ASIGNADA",
        progress: studentMission?.progress || 0,
        completedAt: studentMission?.completedAt || null,
        evidence: studentMission?.evidence || null
      }
    })

    // Calcular puntos ganados de misiones completadas
    const totalPointsFromMissions = studentMissions
      .filter((sm) => sm.status === "COMPLETADA" || sm.status === "VERIFICADA")
      .reduce((acc, sm) => acc + sm.mission.pointsReward, 0)

    return NextResponse.json({
      missions,
      stats: {
        total: missions.length,
        pending: missions.filter((m) => m.status === "PENDIENTE" || m.status === "NO_ASIGNADA").length,
        inProgress: missions.filter((m) => m.status === "EN_PROGRESO").length,
        completed: missions.filter((m) => m.status === "COMPLETADA" || m.status === "VERIFICADA").length,
        totalPointsEarned: totalPointsFromMissions
      }
    })
  } catch (error) {
    console.error("Error fetching missions:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST: Aceptar/ejecutar una misión
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = session.user.id as string
    const body = await request.json()
    const { missionId, action } = body

    if (!missionId) {
      return NextResponse.json(
        { error: "ID de misión requerido" },
        { status: 400 }
      )
    }

    // Verificar que la misión existe y está activa
    const mission = await prisma.mission.findUnique({
      where: { id: missionId }
    })

    if (!mission || !mission.isActive) {
      return NextResponse.json(
        { error: "Misión no encontrada o inactiva" },
        { status: 404 }
      )
    }

    // Verificar nivel del estudiante
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId }
    })

    if (!studentProfile) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    if (mission.requiredLevel && studentProfile.level < mission.requiredLevel) {
      return NextResponse.json(
        { error: "Nivel insuficiente para esta misión" },
        { status: 403 }
      )
    }

    // Buscar si ya tiene esta misión
    const existingMission = await prisma.studentMission.findUnique({
      where: {
        studentId_missionId: {
          studentId: userId,
          missionId
        }
      }
    })

    if (action === "accept") {
      // Aceptar la misión
      if (existingMission) {
        return NextResponse.json(
          { error: "Ya tienes esta misión asignada" },
          { status: 400 }
        )
      }

      const studentMission = await prisma.studentMission.create({
        data: {
          studentId: userId,
          missionId,
          status: "PENDIENTE",
          progress: 0
        }
      })

      // Crear notificación
      await prisma.notification.create({
        data: {
          userId,
          title: "Misión aceptada",
          message: `Has aceptado la misión: ${mission.title}`,
          type: "MISION_DISPONIBLE",
          link: "/misiones"
        }
      })

      return NextResponse.json({ studentMission })
    }

    if (action === "start") {
      // Iniciar la misión
      if (!existingMission || existingMission.status !== "PENDIENTE") {
        return NextResponse.json(
          { error: "No puedes iniciar esta misión" },
          { status: 400 }
        )
      }

      const studentMission = await prisma.studentMission.update({
        where: { id: existingMission.id },
        data: { status: "EN_PROGRESO" }
      })

      return NextResponse.json({ studentMission })
    }

    if (action === "complete") {
      // Completar la misión
      if (!existingMission || existingMission.status !== "EN_PROGRESO") {
        return NextResponse.json(
          { error: "No puedes completar esta misión" },
          { status: 400 }
        )
      }

      const studentMission = await prisma.studentMission.update({
        where: { id: existingMission.id },
        data: {
          status: "COMPLETADA",
          progress: 100,
          completedAt: new Date()
        }
      })

      // Otorgar puntos
      await prisma.point.create({
        data: {
          userId,
          amount: mission.pointsReward,
          source: "MISION_COMPLETADA",
          description: `Misión completada: ${mission.title}`
        }
      })

      // Crear notificación de logro
      await prisma.notification.create({
        data: {
          userId,
          title: "¡Misión completada!",
          message: `Has ganado ${mission.pointsReward} puntos por completar: ${mission.title}`,
          type: "LOGRO_OBTENIDO",
          link: "/misiones"
        }
      })

      // Registrar actividad
      await prisma.activity.create({
        data: {
          userId,
          action: "MISION_COMPLETADA",
          details: {
            missionId: mission.id,
            missionTitle: mission.title,
            pointsEarned: mission.pointsReward
          }
        }
      })

      // Verificar si ganó alguna insignia
      await checkAndAwardBadges(userId)

      return NextResponse.json({ studentMission })
    }

    return NextResponse.json(
      { error: "Acción no válida" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error processing mission:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// Función para verificar y otorgar insignias automáticamente
async function checkAndAwardBadges(userId: string) {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId }
    })

    if (!profile) return

    // Obtener todas las insignias disponibles
    const badges = await prisma.badge.findMany({
      where: { isActive: true }
    })

    // Obtener insignias que ya tiene el estudiante
    const earnedBadges = await prisma.studentBadge.findMany({
      where: { studentId: userId }
    })

    const earnedBadgeIds = earnedBadges.map((eb) => eb.badgeId)

    // Verificar cada insignia
    for (const badge of badges) {
      if (earnedBadgeIds.includes(badge.id)) continue

      let shouldEarn = false

      switch (badge.name) {
        case "Excelencia":
          // Promedio superior a 4.5
          if (profile.averageGrade >= 4.5) shouldEarn = true
          break
        case "Explorador":
          // Completar primer semestre
          if (profile.currentSemester > 1) shouldEarn = true
          break
        case "Velocista":
          // Aprobar todos los cursos del semestre actual
          const enrollments = await prisma.enrollment.findMany({
            where: {
              studentId: profile.id,
              status: "APROBADO"
            }
          })
          if (enrollments.length >= 5) shouldEarn = true
          break
        // Agregar más condiciones para otras insignias...
      }

      if (shouldEarn) {
        await prisma.studentBadge.create({
          data: {
            studentId: userId,
            badgeId: badge.id
          }
        })

        // Notificar al estudiante
        await prisma.notification.create({
          data: {
            userId,
            title: "¡Nueva insignia desbloqueada!",
            message: `Has obtenido la insignia: ${badge.name}`,
            type: "LOGRO_OBTENIDO",
            link: "/logros"
          }
        })
      }
    }
  } catch (error) {
    console.error("Error checking badges:", error)
  }
}
