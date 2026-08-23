type EnrollmentForSemester = {
  status: string
  course: { semester?: { number: number } }
}

type GradeRecord = {
  grade: number | null
  status?: string
}

export function getCurrentSemester(
  enrollments: EnrollmentForSemester[],
  fallback: number
) {
  const activeSemesters = enrollments
    .filter((enrollment) => enrollment.status === "CURSANDO")
    .map((enrollment) => enrollment.course.semester?.number)
    .filter((semester): semester is number => semester !== undefined)

  if (activeSemesters.length) return Math.max(...activeSemesters)

  const approvedSemesters = enrollments
    .filter((enrollment) => enrollment.status === "APROBADO")
    .map((enrollment) => enrollment.course.semester?.number)
    .filter((semester): semester is number => semester !== undefined)

  return approvedSemesters.length ? Math.max(...approvedSemesters) : fallback
}

export function getAverageGrade(
  academicHistory: GradeRecord[],
  enrollments: GradeRecord[],
  fallback: number
) {
  const historyGrades = academicHistory
    .filter((record) => record.status !== "PENDIENTE" && Number.isFinite(record.grade))
    .map((record) => record.grade as number)

  if (historyGrades.length) {
    return Number((historyGrades.reduce((total, grade) => total + grade, 0) / historyGrades.length).toFixed(2))
  }

  const enrollmentGrades = enrollments
    .filter((record) => Number.isFinite(record.grade))
    .map((record) => record.grade as number)

  if (enrollmentGrades.length) {
    return Number((enrollmentGrades.reduce((total, grade) => total + grade, 0) / enrollmentGrades.length).toFixed(2))
  }

  return fallback
}