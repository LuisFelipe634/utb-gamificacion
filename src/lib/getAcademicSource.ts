import type { AcademicSource } from "@/lib/academicSource"
import { PrismaAcademicSource } from "@/lib/prismaAcademicSource"
import { HttpAcademicSource } from "@/lib/httpAcademicSource"

export function getAcademicSource(): AcademicSource {
  const enabled = process.env.UNIVERSITY_API_ENABLED === "true"
  const url = process.env.UNIVERSITY_API_URL
  if (enabled && url) {
    return new HttpAcademicSource()
  }
  return new PrismaAcademicSource()
}

export function isExternalAcademicEnabled(): boolean {
  return process.env.UNIVERSITY_API_ENABLED === "true" && !!process.env.UNIVERSITY_API_URL
}
