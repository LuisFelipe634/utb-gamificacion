import { prisma } from "@/lib/prisma"
import type { AcademicSource, AcademicStudentData } from "@/lib/academicSource"

export class PrismaAcademicSource implements AcademicSource {
  async getStudentAcademicData(userId: string): Promise<AcademicStudentData> {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        program: {
          include: {
            semesters: {
              include: {
                courses: {
                  include: { prerequisites: { include: { prerequisite: true } } },
                },
              },
              orderBy: { number: "asc" },
            },
          },
        },
        enrollments: {
          include: { course: { include: { semester: true } } },
        },
      },
    })

    if (!profile) return { profile: null, source: "prisma" }

    // Normalizar a AcademicStudentData shape esperado por curriculum/route
    return {
      profile: {
        id: profile.id,
        userId: profile.userId,
        studentCode: profile.studentCode,
        programId: profile.programId,
        currentSemester: profile.currentSemester,
        admissionYear: profile.admissionYear,
        totalCredits: profile.totalCredits,
        averageGrade: profile.averageGrade,
        level: profile.level,
        program: {
          id: profile.program.id,
          code: profile.program.code,
          name: profile.program.name,
          version: profile.program.version,
          semesters: profile.program.semesters.map((s) => ({
            id: s.id,
            number: s.number,
            name: s.name,
            courses: s.courses.map((c) => ({
              id: c.id,
              code: c.code,
              name: c.name,
              credits: c.credits,
              prerequisites: c.prerequisites.map((p) => ({
                prerequisite: { id: p.prerequisite.id, code: p.prerequisite.code, name: p.prerequisite.name },
              })),
            })),
          })),
        },
        enrollments: profile.enrollments.map((e) => ({
          courseId: e.courseId,
          course: {
            id: e.course.id,
            code: e.course.code,
            name: e.course.name,
            credits: e.course.credits,
            semester: e.course.semester ? { number: e.course.semester.number } : undefined,
          },
          status: e.status,
          grade: e.grade,
          source: e.source,
          semesterCode: e.semesterCode,
        })),
      },
      source: "prisma",
    }
  }
}
