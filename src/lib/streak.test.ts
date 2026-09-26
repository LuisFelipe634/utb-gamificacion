import test from "node:test"
import assert from "node:assert/strict"

import { calculateStreak } from "./streak"

const DIA = 24 * 60 * 60 * 1000
const NOW = new Date("2026-09-26T12:00:00.000Z")

function haceDias(offsets: number[]) {
  return offsets.map((offset) => ({ createdAt: new Date(NOW.getTime() - offset * DIA) }))
}

test("cuenta la racha actual hacia atras desde hoy", () => {
  assert.deepEqual(calculateStreak(haceDias([0, 1, 2, 3]), NOW), {
    current: 4,
    best: 4,
    activeToday: true,
  })
})

test("sin actividad hoy, la racha arranca en ayer", () => {
  assert.deepEqual(calculateStreak(haceDias([1, 2, 3]), NOW), {
    current: 3,
    best: 3,
    activeToday: false,
  })
})

test("el mejor tramo cuenta aunque la racha actual sea mas corta", () => {
  assert.deepEqual(calculateStreak(haceDias([0, 1, 2, 10, 11, 12, 13, 14]), NOW), {
    current: 3,
    best: 5,
    activeToday: true,
  })
})

test("el resultado no depende del orden de las actividades", () => {
  const desordenado = haceDias([3, 0, 12, 1, 13, 2])
  const esperado = { current: 4, best: 4, activeToday: true }

  assert.deepEqual(calculateStreak(desordenado, NOW), esperado)
  assert.deepEqual(calculateStreak([...desordenado].reverse(), NOW), esperado)
})

test("varias actividades del mismo dia cuentan una sola vez", () => {
  const hoy = [
    { createdAt: new Date("2026-09-26T01:00:00.000Z") },
    { createdAt: new Date("2026-09-26T18:00:00.000Z") },
    { createdAt: new Date("2026-09-25T09:00:00.000Z") },
  ]

  assert.deepEqual(calculateStreak(hoy, NOW), { current: 2, best: 2, activeToday: true })
})

test("sin actividades no hay racha", () => {
  assert.deepEqual(calculateStreak([], NOW), { current: 0, best: 0, activeToday: false })
})
