type EnrollmentForSemester = {
  status: string
  course: { semester?: { number: number } }
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