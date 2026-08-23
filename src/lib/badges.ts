import { prisma } from "./prisma";
import { getAverageGrade } from "./academic";

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
          enrollments: true
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

  // Buscar la insignia de 'Excelencia' por nombre (segun seed.ts)
  const excelenciaBadge = await prisma.badge.findFirst({
    where: { name: "Excelencia", category: "RENDIMIENTO" }
  });

  if (excelenciaBadge) {
    const hasBadge = user.badges.some((b) => b.badgeId === excelenciaBadge.id);

    // Si tiene un promedio >= 4.5 y no tiene la insignia, se la asignamos
    if (averageGrade >= 4.5 && !hasBadge) {
      await prisma.studentBadge.create({
        data: {
          studentId: userId,
          badgeId: excelenciaBadge.id,
          verifiedBy: "SYSTEM",
          evidence: "Asignación automática por promedio académico >= 4.5"
        }
      });
      
      // Opcionalmente podemos enviar una notificación de logro obtenido
      await prisma.notification.create({
        data: {
          userId: userId,
          title: "¡Nueva Insignia Obtenida!",
          message: `Has obtenido la insignia "${excelenciaBadge.name}" por mantener un promedio de excelencia.`,
          type: "LOGRO_OBTENIDO",
          link: "/logros"
        }
      });
    }
  }
}
