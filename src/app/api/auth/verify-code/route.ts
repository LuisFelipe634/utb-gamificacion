import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  deriveAdmissionYearFromCode,
  normalizeInstitutionalEmail,
  parseInstitutionalEmail,
  validatePassword,
  validateStudentCode,
} from "@/lib/institutionalEmail";
import { hashOtpCode } from "@/lib/emailProvider";
import { rateLimit, rateLimitKey } from "@/lib/rateLimit";

/**
 * POST /api/auth/verify-code
 * { email, code, name, password, studentCode? }
 * - Prueba de posesión del buzón institucional (OTP).
 * - Aprovisionamiento JIT: crea User(STUDENT) + StudentProfile.
 * - Docentes NO se auto-registran: solo vía /api/admin/teachers.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = normalizeInstitutionalEmail(typeof body?.email === "string" ? body.email : "");
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const rawStudentCode = typeof body?.studentCode === "string" ? body.studentCode.trim() : "";

    if (!email) {
      return NextResponse.json({ error: "Correo institucional inválido" }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Código de 6 dígitos inválido" }, { status: 400 });
    }
    if (name.length < 3 || name.length > 100) {
      return NextResponse.json({ error: "Nombre inválido (3-100 caracteres)" }, { status: 400 });
    }
    const pwdError = validatePassword(password);
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 });
    }

    const rl = rateLimit(rateLimitKey("verify", email), 10, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Demasiados intentos. Solicita un código nuevo." }, { status: 429 });
    }

    const token = await prisma.emailVerificationToken.findUnique({
      where: { codeHash: hashOtpCode(code) },
    });

    if (!token || token.email !== email || token.consumedAt || token.expiresAt < new Date()) {
      return NextResponse.json({ error: "Código inválido o vencido" }, { status: 400 });
    }
    if (token.attempts >= 5) {
      return NextResponse.json({ error: "Código bloqueado por intentos. Solicita uno nuevo." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.emailVerificationToken.update({
        where: { id: token.id },
        data: { consumedAt: new Date() },
      }).catch(() => undefined);
      return NextResponse.json(
        { error: "Este correo ya está registrado. Inicia sesión.", code: "ALREADY_REGISTERED" },
        { status: 409 }
      );
    }

    const parsed = parseInstitutionalEmail(email);
    if (!parsed) {
      return NextResponse.json({ error: "Correo institucional no reconocido" }, { status: 400 });
    }

    // Resolver studentCode + programId + admissionYear (correo = código)
    let studentCode: string | null = null;
    let admissionYear: number | null = null;
    let programId: string | null = null;
    let displayName = name;

    // 1) Allowlist PROA/Banner tiene prioridad si existe
    const allowed = await prisma.allowedStudent.findUnique({ where: { email } }).catch(() => null);

    if (allowed) {
      studentCode = allowed.studentCode;
      admissionYear = allowed.admissionYear;
      programId = allowed.programId;
      if (allowed.fullName && !name) displayName = allowed.fullName;
    } else if (parsed.kind === "code") {
      studentCode = parsed.studentCode;
      admissionYear = parsed.admissionYear;
    } else {
      // Email nominal sin allowlist: exige studentCode manual
      const codeError = validateStudentCode(rawStudentCode);
      if (codeError) {
        await prisma.emailVerificationToken.update({
          where: { id: token.id },
          data: { attempts: { increment: 1 } },
        }).catch(() => undefined);
        return NextResponse.json(
          { error: "Tu correo no contiene el código. Ingresa tu código estudiantil (8-10 dígitos).", code: "STUDENT_CODE_REQUIRED" },
          { status: 400 }
        );
      }
      studentCode = rawStudentCode;
      admissionYear = deriveAdmissionYearFromCode(rawStudentCode);
    }

    if (!studentCode || !admissionYear) {
      return NextResponse.json({ error: "No se pudo derivar tu información académica del correo" }, { status: 400 });
    }

    // Programa: del allowlist o default ISCO activo; ampliable a multi-programa
    // por prefijo de código o dominio cuando PROA lo provea.
    if (!programId) {
      const program =
        (await prisma.program.findFirst({ where: { code: "ISCO", isActive: true } })) ??
        (await prisma.program.findFirst({ where: { isActive: true } }));
      if (!program) {
        return NextResponse.json({ error: "Sin programas académicos configurados" }, { status: 500 });
      }
      programId = program.id;
    }

    // Unicidad de código (evita colisión con seed demo)
    const codeTaken = await prisma.studentProfile.findUnique({ where: { studentCode } }).catch(() => null);
    if (codeTaken) {
      return NextResponse.json({ error: "Ese código estudiantil ya está vinculado a otra cuenta" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name: displayName,
          passwordHash,
          role: "STUDENT",
          studentProfile: {
            create: {
              studentCode,
              programId: programId as string,
              currentSemester: 1,
              admissionYear: admissionYear as number,
              totalCredits: 0,
              averageGrade: 0,
              level: 1,
              // meritcoinStudentId queda NULL hasta vincular Moodle real (no auto STU-x)
            },
          },
        },
        include: { studentProfile: true },
      });

      await tx.emailVerificationToken.update({
        where: { id: token.id },
        data: { consumedAt: new Date() },
      });

      await tx.notification.create({
        data: {
          userId: created.id,
          title: "¡Bienvenido a UTB Gamificación!",
          message: `Tu cuenta ${email} fue verificada. Completa tu malla y empieza a ganar puntos.`,
          type: "INFO",
          link: "/malla",
        },
      }).catch(() => undefined);

      return created;
    });

    return NextResponse.json(
      {
        ok: true,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        studentCode: user.studentProfile?.studentCode,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error verify-code:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
