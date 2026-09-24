import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  normalizeInstitutionalEmail,
  parseInstitutionalEmail,
} from "@/lib/institutionalEmail";
import { generateOtpCode, hashOtpCode, sendVerificationCode } from "@/lib/emailProvider";
import { rateLimit, rateLimitKey } from "@/lib/rateLimit";

const OTP_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const rawEmail = typeof body?.email === "string" ? body.email : "";

    const email = normalizeInstitutionalEmail(rawEmail);
    if (!email) {
      return NextResponse.json(
        { error: "Usa tu correo institucional @utb.edu.co" },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(rateLimitKey("otp", email, ip), 5, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera una hora antes de reintentar." },
        { status: 429 }
      );
    }

    const parsed = parseInstitutionalEmail(email);
    if (!parsed) {
      return NextResponse.json(
        { error: "Correo institucional no reconocido" },
        { status: 400 }
      );
    }

    // Si ya existe usuario, no re-registrar: ir a /login
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Este correo ya está registrado. Inicia sesión.", code: "ALREADY_REGISTERED" },
        { status: 409 }
      );
    }

    // Invalida códigos previos vigentes del mismo email
    await prisma.emailVerificationToken.updateMany({
      where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });

    const code = generateOtpCode();
    await prisma.emailVerificationToken.create({
      data: {
        email,
        codeHash: hashOtpCode(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        attempts: 0,
      },
    });

    try {
      const { via } = await sendVerificationCode(email, code);
      return NextResponse.json({
        ok: true,
        via,
        emailKind: parsed.kind,
        // En dev devolvemos pista para DX; en prod nunca exponer el código
        ...(process.env.NODE_ENV !== "production" ? { devHint: "Revisa la consola del servidor" } : {}),
      });
    } catch (error) {
      console.error("Error enviando OTP:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "No se pudo enviar el código" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error request-code:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export { MAX_ATTEMPTS };
