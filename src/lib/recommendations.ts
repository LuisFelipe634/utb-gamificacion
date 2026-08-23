import { prisma } from "@/lib/prisma"

type RecommendationItem = {
  type: "CURSO_SUGERIDO" | "ALERTA_ATRASO" | "ELECTIVA_RECOMENDADA" | "MEJORA_PROMEDIO" | "RUTA_ACademica"
  title: string
  description: string
  priority: number // 1=alta, 2=media, 3=baja
}

/**
 * Generates smart recommendations for a student based on:
 * - Which prerequisites they've completed (unlocked courses)
 * - Failed courses they need to retake
 * - Bottleneck courses that unlock many others
 * - Low GPA warnings
 */
export async function generateRecommendations(studentProfileId: string): Promise<void> {
  // Get student profile with all related data
  const profile = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    include: {
      program: true,
      enrollments: {
        include: {
          course: {
            include: {
              semester: true,
              prerequisites: { include: { prerequisite: true } },
              requiredBy: { include: { course: true } },
            },
          },
        },
      },
      academicHistory: true,
    },
  })

  if (!profile) return

  // Collect all courses in the program
  const allCourses = await prisma.course.findMany({
    where: { programId: profile.programId, isActive: true },
    include: {
      semester: true,
      prerequisites: { include: { prerequisite: true } },
      requiredBy: { include: { course: true } },
    },
  })

  // Determine approved, failed, and in-progress course codes
  const approvedCourseIds = new Set<string>()
  const failedCourseIds = new Set<string>()
  const inProgressCourseIds = new Set<string>()

  for (const enrollment of profile.enrollments) {
    if (enrollment.status === "APROBADO") {
      approvedCourseIds.add(enrollment.courseId)
    } else if (enrollment.status === "REPROBADO") {
      failedCourseIds.add(enrollment.courseId)
    } else if (enrollment.status === "CURSANDO" || enrollment.status === "INSCRITO") {
      inProgressCourseIds.add(enrollment.courseId)
    }
  }

  // Also check academic history for approved courses
  for (const record of profile.academicHistory) {
    if (record.status === "APROBADO") {
      const course = allCourses.find((c) => c.code === record.courseCode)
      if (course) approvedCourseIds.add(course.id)
    } else if (record.status === "REPROBADO") {
      const course = allCourses.find((c) => c.code === record.courseCode)
      if (course && !approvedCourseIds.has(course.id)) failedCourseIds.add(course.id)
    }
  }

  const recommendations: RecommendationItem[] = []

  // 1. Find UNLOCKED courses (prerequisites met, not yet taken)
  const unlockedCourses = allCourses.filter((course) => {
    // Skip if already approved, in progress, or currently enrolled
    if (approvedCourseIds.has(course.id)) return false
    if (inProgressCourseIds.has(course.id)) return false

    // Check if all prerequisites are met
    if (course.prerequisites.length === 0) {
      // No prerequisites — only suggest if from the next semester
      return (course.semester?.number ?? 0) <= profile.currentSemester + 1
    }

    return course.prerequisites.every((prereq) =>
      approvedCourseIds.has(prereq.prerequisiteId)
    )
  })

  // 2. Identify BOTTLENECK courses (unlock the most other courses)
  const bottleneckCourses = unlockedCourses
    .map((course) => ({
      course,
      unlocksCount: course.requiredBy.length,
    }))
    .sort((a, b) => b.unlocksCount - a.unlocksCount)

  // Add top bottleneck courses as high-priority recommendations
  for (const item of bottleneckCourses.slice(0, 2)) {
    if (item.unlocksCount > 0) {
      recommendations.push({
        type: "CURSO_SUGERIDO",
        title: `📚 Prioriza: ${item.course.name}`,
        description: `Esta materia desbloquea ${item.unlocksCount} curso${item.unlocksCount > 1 ? "s" : ""} más. Tomarla el próximo semestre acelera tu avance en la carrera.`,
        priority: 1,
      })
    }
  }

  // 3. Failed courses that need retaking
  for (const courseId of failedCourseIds) {
    // Don't recommend if already approved on a later attempt
    if (approvedCourseIds.has(courseId)) continue

    const course = allCourses.find((c) => c.id === courseId)
    if (!course) continue

    recommendations.push({
      type: "ALERTA_ATRASO",
      title: `⚠️ Repetir: ${course.name}`,
      description: `Reprobaste esta materia anteriormente. Te recomendamos inscribirla de nuevo lo antes posible${course.requiredBy.length > 0 ? `, ya que es prerrequisito de ${course.requiredBy.length} curso${course.requiredBy.length > 1 ? "s" : ""}` : ""}.`,
      priority: 1,
    })
  }

  // 4. Suggest unlocked elective courses
  const electivas = unlockedCourses.filter(
    (c) => c.type === "ELECTIVA" || c.type === "LIBRE_ELECCION"
  )
  if (electivas.length > 0) {
    const names = electivas.slice(0, 3).map((c) => c.name).join(", ")
    recommendations.push({
      type: "ELECTIVA_RECOMENDADA",
      title: "💡 Electivas disponibles",
      description: `Puedes inscribir las siguientes electivas: ${names}. Estas suman créditos valiosos para tu avance.`,
      priority: 3,
    })
  }

  // 5. Suggest next-semester unlocked mandatory courses
  const nextSemesterCourses = unlockedCourses.filter(
    (c) =>
      c.type === "OBLIGATORIO" &&
      !bottleneckCourses.slice(0, 2).some((b) => b.course.id === c.id) &&
      !failedCourseIds.has(c.id)
  )

  if (nextSemesterCourses.length > 0) {
    const names = nextSemesterCourses.slice(0, 4).map((c) => c.name).join(", ")
    recommendations.push({
      type: "RUTA_ACademica",
      title: "🗺️ Materias sugeridas para el próximo semestre",
      description: `Basado en tu progreso, puedes inscribir: ${names}.`,
      priority: 2,
    })
  }

  // 6. Low GPA warning
  if (profile.averageGrade > 0 && profile.averageGrade < 3.5) {
    recommendations.push({
      type: "MEJORA_PROMEDIO",
      title: "📉 Tu promedio necesita atención",
      description: `Tu promedio actual es ${profile.averageGrade.toFixed(1)}. Considera reducir la carga académica el próximo semestre y enfocarte en mejorar tus calificaciones.`,
      priority: 1,
    })
  }

  // If no specific recommendations, add a general one
  if (recommendations.length === 0 && unlockedCourses.length > 0) {
    const names = unlockedCourses.slice(0, 4).map((c) => c.name).join(", ")
    recommendations.push({
      type: "CURSO_SUGERIDO",
      title: "📚 Materias disponibles",
      description: `Tienes ${unlockedCourses.length} materias desbloqueadas. Algunas opciones: ${names}.`,
      priority: 2,
    })
  }

  // Clear old unread recommendations and save new ones
  await prisma.recommendation.deleteMany({
    where: {
      studentId: studentProfileId,
      isRead: false,
    },
  })

  for (const rec of recommendations) {
    await prisma.recommendation.create({
      data: {
        studentId: studentProfileId,
        type: rec.type,
        title: rec.title,
        description: rec.description,
        priority: rec.priority,
        isRead: false,
      },
    })
  }
}
