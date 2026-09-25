import test from "node:test"
import assert from "node:assert/strict"

import { getCreditLimit, getCurrentSemester, filterRewardEligibleCourses } from "./academic"

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

test("reward-eligible courses are filtered to the student current semester and official enrollments", () => {
  const enrollments = [
    { id: "e1", status: "CURSANDO", semesterCode: "2026-2", source: "UNIVERSITY", courseId: "c1", course: { id: "c1", code: "ALG-101", name: "Álgebra", semester: { number: 3 } } },
    { id: "e2", status: "CURSANDO", semesterCode: "2026-2", source: "UNIVERSITY", courseId: "c2", course: { id: "c2", code: "FIS-201", name: "Física", semester: { number: 5 } } },
    { id: "e3", status: "CURSANDO", semesterCode: "2026-1", source: "UNIVERSITY", courseId: "c3", course: { id: "c3", code: "CAL-202", name: "Cálculo", semester: { number: 2 } } },
    { id: "e4", status: "CURSANDO", semesterCode: "2026-2", source: "MANUAL", courseId: "c4", course: { id: "c4", code: "P-999", name: "Manual", semester: { number: 3 } } },
  ]

  const eligibleCourses = filterRewardEligibleCourses(enrollments, "2026-2")

  assert.deepEqual(eligibleCourses.map((course) => course.id), ["c1", "c2"])
  assert.equal(eligibleCourses.length, 2)
  assert.ok(eligibleCourses.every((course) => course.semester === 5 || course.semester === 3))
})
