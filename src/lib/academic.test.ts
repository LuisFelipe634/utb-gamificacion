import test from "node:test"
import assert from "node:assert/strict"

import { getCreditLimit, getCurrentSemester } from "./academic"

test("credit limit is 20 for averages of 4.0 or higher and 18 otherwise", () => {
  assert.equal(getCreditLimit(4.7), 20)
  assert.equal(getCreditLimit(4.0), 20)
  assert.equal(getCreditLimit(3.9), 18)
})

test("current semester follows active courses and completed course history", () => {
  const enrollments = [
    { status: "APROBADO", semesterCode: "2026-1", courseId: "a", course: { semester: { number: 1 } } },
    { status: "APROBADO", semesterCode: "2026-1", courseId: "b", course: { semester: { number: 2 } } },
    { status: "CURSANDO", semesterCode: "2026-2", courseId: "c", course: { semester: { number: 3 } } },
  ]

  assert.equal(getCurrentSemester(enrollments, 1, "2026-2"), 3)
  assert.equal(getCurrentSemester(enrollments.slice(0, 2), 1, "2026-2"), 2)
})
