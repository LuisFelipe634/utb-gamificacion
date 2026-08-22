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

    const missions = await prisma.studentMission.findMany({
      where: { studentId: userId },
      include: {
        mission: {
          include: {
            course: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ missions })
  } catch (error) {
    console.error("Error fetching missions:", error)
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

    const userId = session.user.id
    const body = await request.json()
    const { missionId, evidence } = body

    if (!missionId || typeof missionId !== "string") {
      return NextResponse.json(
        { error: "ID de misión requerido" },
        { status: 400 }
      )
    }

    // Verificar si la misión existe y está activa
    const mission = await prisma.mission.findUnique({
      where: { id: missionId }
    })

    if (!mission || !mission.isActive) {
      return NextResponse.json(
        { error: "Misión no encontrada o inactiva" },
        { status: 404 }
      )
    }

    // Verificar si el estudiante ya tiene esta misión
    const existingMission = await prisma.studentMission.findUnique({
      where: {
        studentId_missionId: {
          studentId: userId,
          missionId: missionId
        }
      }
    })

    if (existingMission) {
      return NextResponse.json(
        { error: "Ya tienes esta misión asignada" },
        { status: 400 }
      )
    }

    // Crear la misión para el estudiante
    const studentMission = await prisma.studentMission.create({
      data: {
        studentId: userId,
        missionId: missionId,
        evidence: typeof evidence === "string" ? evidence : undefined,
        status: "PENDIENTE"
      },
      include: {
        mission: true
      }
    })

    return NextResponse.json({ mission: studentMission }, { status: 201 })
  } catch (error) {
    console.error("Error creating mission:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
