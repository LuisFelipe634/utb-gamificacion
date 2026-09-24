/**
 * Import PROA/Banner -> AllowedStudent (fuente de verdad académica).
 * Uso: npx tsx scripts/import-proa.ts ./proa.csv
 * CSV: email,studentCode,programCode,admissionYear,fullName?
 * Ej: 2019123456@utb.edu.co,2019123456,ISCO,2019,Juan Pérez
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Uso: npx tsx scripts/import-proa.ts ./proa.csv");
    process.exit(1);
  }
  const raw = readFileSync(file, "utf-8");
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const header = lines[0].toLowerCase();
  const start = header.includes("email") ? 1 : 0;
  let upserted = 0;

  for (const line of lines.slice(start)) {
    const [emailRaw, studentCodeRaw, programCodeRaw, yearRaw, ...nameParts] =
      line.split(",").map((s) => s.trim());
    const email = emailRaw?.toLowerCase();
    if (!email?.endsWith("@utb.edu.co") || !studentCodeRaw) continue;
    const program = await prisma.program.findFirst({
      where: { code: (programCodeRaw || "ISCO").toUpperCase() },
    });
    if (!program) {
      console.warn(`Programa no encontrado: ${programCodeRaw} (${email})`);
      continue;
    }
    await prisma.allowedStudent.upsert({
      where: { email },
      update: {
        studentCode: studentCodeRaw,
        programId: program.id,
        admissionYear: Number(yearRaw) || Number(studentCodeRaw.slice(0, 4)),
        fullName: nameParts.join(",") || null,
      },
      create: {
        email,
        studentCode: studentCodeRaw,
        programId: program.id,
        admissionYear: Number(yearRaw) || Number(studentCodeRaw.slice(0, 4)),
        fullName: nameParts.join(",") || null,
      },
    });
    upserted++;
  }
  console.log(`✅ AllowedStudent actualizados: ${upserted}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
