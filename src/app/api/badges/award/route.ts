import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { emitLocalBadgeToMeritcoin } from "@/lib/meritcoin"

/**
 * POST /api/badges/award { badgeId }
 * Emite una insignia local ya ganada a Meritcoin (ERC-1155 on-chain).
 * Requiere que el estudiante tenga wallet registrada en su perfil.
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as { badgeId?: unknown } | null
    if (!body || typeof body.badgeId !== "string" || !body.badgeId.trim()) {
      return NextResponse.json({ error: "badgeId requerido" }, { status: 400 })
    }

    const result = await emitLocalBadgeToMeritcoin(session.user.id as string, body.badgeId.trim())

    if (!result.awarded) {
      const status =
        result.reason === "no-wallet"
          ? 422
          : result.reason === "invalid-wallet"
            ? 400
            : result.reason === "not-configured"
              ? 503
              : 200
      const messages: Record<string, string> = {
        "not-configured": "Meritcoin no está configurado (MERITCOIN_API_URL)",
        "no-wallet": "Registra tu wallet Ethereum en tu perfil para emitir on-chain",
        "invalid-wallet": "La wallet registrada es inválida",
        "already-awarded": "Esta insignia ya está registrada on-chain",
        error: "No se pudo emitir la insignia",
      }
      return NextResponse.json(
        { awarded: false, reason: result.reason, message: messages[result.reason] ?? "No emitido", detail: "detail" in result ? result.detail : undefined },
        { status }
      )
    }

    return NextResponse.json(
      { awarded: true, awardId: result.awardId, txHash: result.txHash, chainStatus: result.chainStatus },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error en POST /api/badges/award:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
