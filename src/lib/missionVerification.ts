import { prisma } from "@/lib/prisma"
import { getAverageGrade } from "@/lib/academic"
import { computeConsecutiveAccessStreak, countUniqueCompletedMissions } from "@/lib/missionRules"

export type VerificationResult = {
  passed: boolean
  progress: number
  message: string
}

const CREDITS_PER_SEMESTER = 12

export function getCurrentPeriod(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() < 6 ? 1 : 2}`
}

type MissionRule = {
  verificationKey: string | null
  verificationValue: string | null
}

export async function verifyMission(
  mission: MissionRule,
  userId: string,
  metadata?: string | null
): Promise<VerificationResult> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      enrollments: { include: { course: true } },
      academicHistory: true,
    },
  })

  if (!profile) {
    return { passed: false, progress: 0, message: "Perfil del estudiante no encontrado" }
  }

  const currentPeriod = getCurrentPeriod()

  // Créditos aprobados únicos en el historial
  const approvedByCourse = new Map<string, number>()
  for (const enrollment of profile.enrollments) {
    if (enrollment.status === "APROBADO" && enrollment.course) {
      approvedByCourse.set(enrollment.courseId, enrollment.course.credits)
    }
  }
  const approvedCourseIds = new Set(approvedByCourse.keys())
  const approvedCredits = Array.from(approvedByCourse.values()).reduce((total, credits) => total + credits, 0)

  const failed = (message: string, progress = 0): VerificationResult => ({ passed: false, progress, message })
  const passed = (message: string, progress = 100): VerificationResult => ({ passed: true, progress, message })

  switch (mission.verificationKey) {
    case "RACHA_7_DIAS_ACCESO": {
      const accesses = await prisma.activity.findMany({
        where: {
          userId,
          OR: [
            { action: "LOGIN" },
            { action: "PAGE_VIEW:/dashboard" },
            { action: "ACADEMIC_DAILY_ACTIVITY" }
          ]
        },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
      })

      const streak = computeConsecutiveAccessStreak(accesses)

      if (streak >= 7) {
        return passed(`Mantienes una racha de ${streak} días consecutivos de acceso.`)
      }

      return failed(
        `Te faltan ${Math.max(0, 7 - streak)} días consecutivos de acceso. Tu racha actual es de ${streak} días.`,
        Math.min(99, Math.round((streak / 7) * 100))
      )
    }

    case "COMPLETAR_3_MISIONES_SEMANA": {
      const now = new Date()
      const missions = await prisma.studentMission.findMany({
        where: {
          studentId: userId,
          status: "COMPLETADA",
          completedAt: {
            not: null,
          },
        },
        select: {
          missionId: true,
          completedAt: true,
        },
      })

      const uniqueCompleted = countUniqueCompletedMissions(
        missions.map((mission) => ({
          missionId: mission.missionId,
          completedAt: mission.completedAt ?? now,
        })),
        now,
        7
      )

      if (uniqueCompleted >= 3) {
        return passed(`Completaste ${uniqueCompleted} misiones distintas en los últimos 7 días.`)
      }

      const remaining = Math.max(0, 3 - uniqueCompleted)
      return failed(
        `Necesitas completar ${remaining} misión(es) más en la última semana (llevas ${uniqueCompleted} de 3).`,
        Math.min(99, Math.round((uniqueCompleted / 3) * 100))
      )
    }

    case "SIN_NOTIFICACIONES_PENDIENTES": {
      const pendingNotifications = await prisma.notification.count({
        where: {
          userId,
          isRead: false
        }
      })

      if (pendingNotifications === 0) {
        return passed("No tienes notificaciones pendientes por revisar.")
      }

      return failed(
        `Todavía tienes ${pendingNotifications} notificación(es) sin leer.`,
        Math.max(0, 100 - pendingNotifications * 25)
      )
    }

    case "APROBAR_CREDITOS_SEMESTRE": {
      const target = Number(mission.verificationValue) || 0
      // Solo UNIVERSITY cuenta: los MANUAL (auto-selección del estudiante)
      // no otorgan créditos verificables hasta aval docente/PROA.
      const approvedInPeriod = profile.enrollments
        .filter(
          (enrollment) =>
            enrollment.status === "APROBADO" &&
            enrollment.semesterCode === currentPeriod &&
            enrollment.course &&
            (enrollment as { source?: string }).source !== "MANUAL"
        )
        .reduce((total, enrollment) => total + enrollment.course.credits, 0)

      if (approvedInPeriod >= target) {
        return passed(`Aprobaste ${approvedInPeriod} de ${target} créditos este semestre.`)
      }
      return failed(
        `Aún te faltan ${Math.max(0, target - approvedInPeriod)} créditos aprobados este semestre (llevas ${approvedInPeriod} de ${target}).`,
        target > 0 ? Math.min(99, Math.round((approvedInPeriod / target) * 100)) : 0
      )
    }

    case "MEJORAR_PROMEDIO": {
      const improvement = Number(mission.verificationValue) || 0.5
      const currentAverage = getAverageGrade(profile.academicHistory, profile.enrollments, profile.averageGrade)
      let initialAverage = profile.averageGrade
      try {
        const parsed = metadata ? JSON.parse(metadata) : null
        if (parsed && typeof parsed.initialAverage === "number") {
          initialAverage = parsed.initialAverage
        }
      } catch {
        // metadata inválida: se usa el promedio actual como línea base
      }

      const target = Number((initialAverage + improvement).toFixed(2))
      if (currentAverage >= target) {
        return passed(`Tu promedio subió de ${initialAverage.toFixed(2)} a ${currentAverage.toFixed(2)} (meta: ${target.toFixed(2)}).`)
      }
      return failed(
        `Tu promedio es ${currentAverage.toFixed(2)} y debes llegar a ${target.toFixed(2)} (${improvement} puntos más que tu línea base de ${initialAverage.toFixed(2)}).`
      )
    }

    case "CERO_REPROBADOS": {
      const failedInPeriod = profile.enrollments.filter(
        (enrollment) => enrollment.status === "REPROBADO" && enrollment.semesterCode === currentPeriod
      )
      if (failedInPeriod.length === 0) {
        return passed("No registras materias reprobadas en el semestre actual.")
      }
      return failed(`Registras ${failedInPeriod.length} materia(s) reprobada(s) este semestre.`)
    }

    case "COMPLETAR_PREREQUISITOS": {
      const courseCode = mission.verificationValue
      if (!courseCode) {
        return failed("Falta el curso de referencia de la misión.")
      }
      const course = await prisma.course.findUnique({
        where: { code: courseCode },
        include: { prerequisites: true },
      })
      if (!course) {
        return failed(`El curso de referencia ${courseCode} no existe.`)
      }

      const prerequisites = course.prerequisites.map((prerequisite) => prerequisite.prerequisiteId)
      if (prerequisites.length === 0) {
        return passed(`${course.code} no tiene prerrequisitos pendientes.`, 100)
      }

      const missing = prerequisites.filter((id) => !approvedCourseIds.has(id))
      const completed = prerequisites.length - missing.length
      if (missing.length === 0) {
        return passed(`Completaste todos los prerrequisitos de ${course.code} (${course.name}).`)
      }
      return failed(
        `Faltan ${missing.length} prerrequisito(s) de ${course.code}: ${missing.length > 0 ? "aún no aprobados" : ""}.`,
        Math.round((completed / prerequisites.length) * 100)
      )
    }

    case "AVANZAR_SEMESTRE": {
      const required = profile.currentSemester * CREDITS_PER_SEMESTER
      if (approvedCredits >= required) {
        return passed(`Acumulas ${approvedCredits} créditos aprobados (necesitas ${required} para avanzar del semestre ${profile.currentSemester}).`)
      }
      return failed(
        `Para avanzar del semestre ${profile.currentSemester} necesitas ${required} créditos aprobados y llevas ${approvedCredits}.`,
        required > 0 ? Math.min(99, Math.round((approvedCredits / required) * 100)) : 0
      )
    }

    default:
      return passed("Cumplimiento registrado automáticamente.")
  }
}