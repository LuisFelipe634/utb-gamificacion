import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Backfill de la llave canónica Meritcoin (STU-{id}).
 *
 * Uso:
 *   1. Exporta el mapeo desde MariaDB de Moodle.
 *      Credenciales: NO van en el repo. Usa `-p` (mysql pide la clave) o
 *      MYSQL_PWD desde tu .env local de Moodle.
 *      docker exec -e MYSQL_PWD="$MOODLE_DB_PASS" meritcoin-mariadb \
 *        mysql -u bn_moodle bitnami_moodle \
 *        -e "SELECT email, id FROM mdl_user WHERE deleted=0 AND email LIKE '%@utb.edu.co';" > moodle-users.txt
 *   2. Arma un JSON { "email@utb.edu.co": "STU-3" } y corre:
 *      npx tsx prisma/backfill-meritcoin-ids.ts --map ./meritcoin-map.json [--provision]
 *
 * Por cada entrada: normaliza a STU-x, actualiza meritcoinStudentId (@unique),
 * consulta GET /wallets/{STU-x} en Meritcoin y guarda la wallet si existe.
 * Con --provision, si no existe wallet la provisiona con MERITCOIN_ONBOARDING_COURSE_ID.
 */

function normalize(value: string): string | null {
  const t = value.trim()
  if (!t) return null
  if (/^STU-\d+$/i.test(t)) return `STU-${t.slice(4)}`
  if (/^\d{1,7}$/.test(t)) return `STU-${t}`
  return t.length <= 100 ? t : null
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(name)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null
}

const API = (process.env.MERITCOIN_API_URL || 'http://localhost:8000').replace(/\/$/, '')
const ONBOARDING_COURSE = process.env.MERITCOIN_ONBOARDING_COURSE_ID || 'GAMIFICACION-ONBOARDING'

async function lookupWallet(studentId: string): Promise<string | null> {
  try {
    const res = await fetch(`${API}/wallets/${encodeURIComponent(studentId)}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as { wallet_address?: string }
    return typeof data.wallet_address === 'string' && /^0x[a-fA-F0-9]{40}$/.test(data.wallet_address.trim())
      ? data.wallet_address.trim()
      : null
  } catch {
    return null
  }
}

async function provisionWallet(studentId: string): Promise<string | null> {
  try {
    const res = await fetch(`${API}/wallets/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        course_id: ONBOARDING_COURSE,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { wallet_address?: string }
    return typeof data.wallet_address === 'string' ? data.wallet_address.trim() : null
  } catch {
    return null
  }
}

async function main() {
  const mapPath = arg('--map')
  if (!mapPath) throw new Error('Falta --map ./meritcoin-map.json')
  const provision = process.argv.includes('--provision')
  const entries = Object.entries(JSON.parse(readFileSync(mapPath, 'utf8')) as Record<string, string>)

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
  let updated = 0
  for (const [email, rawId] of entries) {
    const studentId = normalize(rawId)
    if (!studentId) {
      console.warn(`Omitido ${email}: ID inválido (${rawId})`)
      continue
    }
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (!user) {
      console.warn(`Omitido ${email}: no existe en gamificación`)
      continue
    }
    let wallet = await lookupWallet(studentId)
    if (!wallet && provision) wallet = await provisionWallet(studentId)
    await prisma.studentProfile.update({
      where: { userId: user.id },
      data: { meritcoinStudentId: studentId, ...(wallet ? { walletAddress: wallet } : {}) },
    })
    updated++
    console.log(`${email} -> ${studentId}${wallet ? ` wallet ${wallet.slice(0, 10)}…` : ' sin wallet'}`)
  }
  await prisma.$disconnect()
  console.log(`Backfill completo: ${updated}/${entries.length}`)
}

main().catch((e) => {
  console.error('Error en backfill:', e)
  process.exit(1)
})
