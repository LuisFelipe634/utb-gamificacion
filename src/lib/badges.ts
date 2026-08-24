import { prisma } from "./prisma";
import { getAverageGrade } from "./academic";

export type BadgeProgress = {
  current: number
  target: number
  percentage: number
}

type StudentBadgeData = {
  studentProfile: {
    averageGrade: number
    academicHistory: { grade: number; status: string }[]
    enrollments: { courseId: string; status: string; grade: number | null; course: { semester: { number: number } } }[]
    program: { semesters: { number: number; courses: { id: string }[] }[] }
  } | null
}

function progress(current: number, target: number): BadgeProgress {
  return { current, target, percentage: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0 }
}

export function getBadgeProgress(user: StudentBadgeData, badgeName: string): BadgeProgress | null {
  const profile = user.studentProfile
  if (!profile) return null

  const approved = profile.enrollments.filter((enrollment) => enrollment.status === "APROBADO")
  if (badgeName === "Explorador") {
    const firstSemester = profile.program.semesters.find((semester) => semester.number === 1)
    const approvedIds = new Set(approved.map((enrollment) => enrollment.courseId))
    const completed = firstSemester?.courses.filter((course) => approvedIds.has(course.id)).length || 0
    return progress(completed, firstSemester?.courses.length || 1)
  }
  if (badgeName === "Velocista") return progress(approved.length, 5)
  if (badgeName === "Excelencia") {
    const average = getAverageGrade(profile.academicHistory, profile.enrollments, profile.averageGrade)
    return progress(Math.round(average * 10), 45)
  }
  if (badgeName === "Especialista") {
    const perfectGrades = [...profile.academicHistory, ...profile.enrollments]
      .filter((record) => record.status !== "PENDIENTE" && record.grade === 5).length
    return progress(perfectGrades, 3)
  }
  return null
}

/**
 * Sincroniza dinámicamente las insignias basadas en el progreso actual del estudiante.
 * @param userId ID del usuario
 */
export async function syncDynamicBadges(userId: string) {
  // Obtener el perfil y el historial del estudiante
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: {
        include: {
          academicHistory: true,
          enrollments: { include: { course: { include: { semester: true } } } },
          program: { include: { semesters: { include: { courses: true } } } }
        }
      },
      badges: true
    }
  });

  if (!user || !user.studentProfile || user.role !== "STUDENT") {
    return;
  }

  // Calcular el promedio dinámico
  const averageGrade = getAverageGrade(
    user.studentProfile.academicHistory,
    user.studentProfile.enrollments,
    user.studentProfile.averageGrade
  );

  const badges = await prisma.badge.findMany({ where: { isActive: true } })
  const earnedIds = new Set(user.badges.map((badge) => badge.badgeId))
  const rules: Record<string, (badgeProgress: BadgeProgress | null) => boolean> = {
    Explorador: (badgeProgress) => badgeProgress?.current === badgeProgress?.target,
    Velocista: (badgeProgress) => (badgeProgress?.current || 0) >= 5,
    Excelencia: () => averageGrade >= 4.5,
    Especialista: (badgeProgress) => (badgeProgress?.current || 0) >= 3
  }

  for (const badge of badges) {
    const rule = rules[badge.name]
    if (!rule || earnedIds.has(badge.id) || !rule(getBadgeProgress(user, badge.name))) continue
    await prisma.studentBadge.create({
      data: {
        studentId: userId,
        badgeId: badge.id,
        verifiedBy: "SYSTEM",
        evidence: `Asignación automática por cumplimiento de la regla: ${badge.name}`
      }
    })
    await prisma.notification.create({
      data: {
        userId,
        title: "¡Nueva insignia obtenida!",
        message: `Has obtenido la insignia «${badge.name}».`,
        type: "LOGRO_OBTENIDO",
        link: "/logros"
      }
    })
  }
}
