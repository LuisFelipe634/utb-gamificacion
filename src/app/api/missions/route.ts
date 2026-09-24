import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getAverageGrade } from "@/lib/academic"
import { verifyMission } from "@/lib/missionVerification"

// GET: Obtener misiones del estudiante
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Solo los estudiantes pueden gestionar misiones" }, { status: 403 })
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
        autoVerify: mission.autoVerify,
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
        evidence: studentMission?.evidence || null,
        reviewComment: studentMission?.reviewComment || null
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

    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Solo los estudiantes pueden gestionar misiones" }, { status: 403 })
    }

    const userId = session.user.id as string
    const body = await request.json()
    const { missionId, action, evidence } = body

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
      if (!existingMission || !["PENDIENTE", "RECHAZADA"].includes(existingMission.status)) {
        return NextResponse.json(
          { error: "No puedes iniciar esta misión" },
          { status: 400 }
        )
      }

      let startMetadata: string | null = null
      try {
        startMetadata = await buildStartMetadata(mission, userId)
      } catch (metaError) {
        console.error("Error en buildStartMetadata:", metaError)
        if (process.env.NODE_ENV === "development") {
          return NextResponse.json(
            { error: "Error al preparar la misión", details: metaError instanceof Error ? metaError.message : String(metaError) },
            { status: 500 }
          )
        }
      }

      const studentMission = await prisma.studentMission.update({
        where: { id: existingMission.id },
        data: {
          status: "EN_PROGRESO",
          progress: 0,
          completedAt: null,
          evidence: null,
          metadata: startMetadata,
          verifiedBy: null,
          verifiedAt: null,
          reviewComment: null
        }
      })

      return NextResponse.json({ studentMission })
    }

    if (action === "complete") {
      if (!existingMission || existingMission.status !== "EN_PROGRESO") {
        return NextResponse.json(
          { error: "No puedes completar esta misión" },
          { status: 400 }
        )
      }

      const submittedEvidence = typeof evidence === "string" ? evidence.trim() : existingMission.evidence?.trim()
      if (!mission.autoVerify && !submittedEvidence) {
        return NextResponse.json(
          { error: "Debes adjuntar una evidencia antes de enviar la misión" },
          { status: 400 }
        )
      }

      // Verificación automática por regla académica
      let verificationMessage: string | null = null
      if (mission.autoVerify && mission.verificationKey) {
        const verification = await verifyMission(
          mission,
          userId,
          existingMission.metadata
        )

        if (!verification.passed) {
          return NextResponse.json(
            {
              error: "Tu misión aún no cumple la condición de verificación automática.",
              message: verification.message,
              progress: verification.progress
            },
            { status: 400 }
          )
        }

        verificationMessage = verification.message
      }

      const studentMission = await prisma.$transaction(async (transaction) => {
        const completedMission = await transaction.studentMission.update({
          where: { id: existingMission.id },
          data: {
            status: mission.autoVerify ? "COMPLETADA" : "EN_REVISION",
            progress: 100,
            completedAt: new Date(),
            evidence: mission.autoVerify
              ? verificationMessage
                ? `Cumplimiento registrado automáticamente — ${verificationMessage}`
                : "Cumplimiento registrado automáticamente"
              : submittedEvidence
          }
        })

        if (mission.autoVerify) {
          await transaction.point.create({
            data: {
              userId,
              amount: mission.pointsReward,
              source: "MISION_COMPLETADA",
              description: `Misión completada: ${mission.title}`
            }
          })
        }

        await transaction.notification.create({
          data: {
            userId,
            title: mission.autoVerify ? "Misión completada" : "Misión enviada a revisión",
            message: mission.autoVerify
              ? `Completaste «${mission.title}» y ganaste ${mission.pointsReward} puntos.`
              : `Tu evidencia para «${mission.title}» será revisada por un docente.`,
            type: mission.autoVerify ? "LOGRO_OBTENIDO" : "INFO",
            link: "/misiones"
          }
        })

        return completedMission
      })

      return NextResponse.json({ studentMission })
    }

    return NextResponse.json(
      { error: "Acción no válida" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error processing mission:", error)
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json(
        { error: "Error interno del servidor", details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// Captura la línea base (ej. promedio al inicio del período) para reglas de verificación automática
async function buildStartMetadata(mission: { verificationKey: string | null }, userId: string): Promise<string | null> {
  if (mission.verificationKey !== "MEJORAR_PROMEDIO") return null

  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      enrollments: { include: { course: true } },
      academicHistory: true,
    },
  })

  if (!profile) return null

  const initialAverage = getAverageGrade(profile.academicHistory, profile.enrollments, profile.averageGrade)
  return JSON.stringify({ initialAverage })
}

