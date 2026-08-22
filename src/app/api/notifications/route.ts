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

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const { notificationId, isRead } = body

    if (!notificationId || typeof notificationId !== "string") {
      return NextResponse.json(
        { error: "ID de notificación requerido" },
        { status: 400 }
      )
    }

    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
        userId: userId
      },
      data: { isRead: typeof isRead === "boolean" ? isRead : true }
    })

    return NextResponse.json({ notification })
  } catch (error) {
    console.error("Error updating notification:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get("id")

    if (!notificationId) {
      return NextResponse.json(
        { error: "ID de notificación requerido" },
        { status: 400 }
      )
    }

    await prisma.notification.delete({
      where: {
        id: notificationId,
        userId: userId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
