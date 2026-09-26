import test from "node:test"
import assert from "node:assert/strict"

import { computeConsecutiveAccessStreak, countUniqueCompletedMissions } from "./missionRules"

test("computeConsecutiveAccessStreak counts consecutive days from today", () => {
  const today = new Date()
  const dates = [
    { createdAt: new Date(today.getTime()) },
    { createdAt: new Date(today.getTime() - 24 * 60 * 60 * 1000) },
    { createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000) },
    { createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000) },
    { createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000) },
  ]

  assert.equal(computeConsecutiveAccessStreak(dates), 4)
})

test("computeConsecutiveAccessStreak does not depend on the order of the records", () => {
  const now = new Date("2026-09-26T12:00:00.000Z")
  const days = [0, 1, 2, 3, 5].map((offset) => ({
    createdAt: new Date(now.getTime() - offset * 24 * 60 * 60 * 1000),
  }))

  assert.equal(computeConsecutiveAccessStreak(days, now), 4)
  assert.equal(computeConsecutiveAccessStreak([...days].reverse(), now), 4)
  assert.equal(computeConsecutiveAccessStreak([days[4], days[0], days[3], days[1], days[2]], now), 4)
})

test("countUniqueCompletedMissions deduplicates by mission in a 7 day window", () => {
  const now = new Date("2026-09-23T12:00:00.000Z")
  const items = [
    { missionId: "m1", completedAt: new Date("2026-09-21T09:00:00.000Z") },
    { missionId: "m1", completedAt: new Date("2026-09-22T10:00:00.000Z") },
    { missionId: "m2", completedAt: new Date("2026-09-19T08:00:00.000Z") },
    { missionId: "m3", completedAt: new Date("2026-09-15T08:00:00.000Z") },
  ]

  assert.equal(countUniqueCompletedMissions(items, now, 7), 2)
})
