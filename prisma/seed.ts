import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Crear programa
  const program = await prisma.program.create({
    data: {
      code: 'ISCO',
      name: 'Ingeniería de Sistemas',
      totalCredits: 160,
      totalSemesters: 10,
      version: '2019'
    }
  })

  console.log('✅ Programa creado:', program.name)

  // Crear semestres y cursos de ejemplo
  const semestersData = [
    {
      number: 1,
      courses: [
        { code: 'MAT101', name: 'Cálculo I', credits: 4, type: 'OBLIGATORIO' as const, prereq: undefined },
        { code: 'PRO101', name: 'Introducción a la Programación', credits: 3, type: 'OBLIGATORIO' as const, prereq: undefined },
        { code: 'FIS101', name: 'Física I', credits: 4, type: 'OBLIGATORIO' as const, prereq: undefined },
        { code: 'QUI101', name: 'Química General', credits: 3, type: 'GENERAL' as const, prereq: undefined },
        { code: 'ING101', name: 'Inglés I', credits: 2, type: 'GENERAL' as const, prereq: undefined }
      ]
    },
    {
      number: 2,
      courses: [
        { code: 'MAT102', name: 'Cálculo II', credits: 4, type: 'OBLIGATORIO' as const, prereq: ['MAT101'] },
        { code: 'PRO102', name: 'Programación Orientada a Objetos', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['PRO101'] },
        { code: 'FIS102', name: 'Física II', credits: 4, type: 'OBLIGATORIO' as const, prereq: ['FIS101'] },
        { code: 'MAT103', name: 'Álgebra Lineal', credits: 3, type: 'OBLIGATORIO' as const, prereq: undefined },
        { code: 'ING102', name: 'Inglés II', credits: 2, type: 'GENERAL' as const, prereq: ['ING101'] }
      ]
    },
    {
      number: 3,
      courses: [
        { code: 'MAT201', name: 'Cálculo III', credits: 4, type: 'OBLIGATORIO' as const, prereq: ['MAT102'] },
        { code: 'PRO201', name: 'Estructuras de Datos', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['PRO102'] },
        { code: 'FIS201', name: 'Física III', credits: 4, type: 'OBLIGATORIO' as const, prereq: ['FIS102'] },
        { code: 'MAT202', name: 'Probabilidad y Estadística', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['MAT103'] },
        { code: 'ING201', name: 'Inglés III', credits: 2, type: 'GENERAL' as const, prereq: ['ING102'] }
      ]
    }
  ]

  for (const semesterData of semestersData) {
    const semester = await prisma.semester.create({
      data: {
        programId: program.id,
        number: semesterData.number,
        name: `Semestre ${semesterData.number}`
      }
    })

    for (const courseData of semesterData.courses) {
      const { prereq, ...courseInfo } = courseData
      const course = await prisma.course.create({
        data: {
          ...courseInfo,
          programId: program.id,
          semesterId: semester.id
        }
      })

      // Agregar prerrequisitos si existen
      if (prereq && Array.isArray(prereq)) {
        for (const prereqCode of prereq) {
          const prereqCourse = await prisma.course.findUnique({
            where: { code: prereqCode }
          })
          if (prereqCourse) {
            await prisma.prerequisite.create({
              data: {
                courseId: course.id,
                prerequisiteId: prereqCourse.id,
                type: 'REQUIRED'
              }
            })
          }
        }
      }
    }
  }

  console.log('✅ Semestres y cursos creados')

  // Crear niveles
  const levelsData = [
    { number: 1, name: 'Novato', minPoints: 0 },
    { number: 2, name: 'Aprendiz', minPoints: 500 },
    { number: 3, name: 'Explorador', minPoints: 1500 },
    { number: 4, name: 'Avanzado', minPoints: 3000 },
    { number: 5, name: 'Maestro', minPoints: 5000 },
    { number: 6, name: 'Leyenda', minPoints: 8000 }
  ]

  for (const levelData of levelsData) {
    await prisma.level.create({ data: levelData })
  }

  console.log('✅ Niveles creados')

  // Crear insignias
  const badgesData = [
    { name: 'Explorador', description: 'Completa tu primer semestre', iconUrl: '🎯', category: 'PROGRESO' as const },
    { name: 'Constante', description: 'Asiste por 4 semanas seguidas', iconUrl: '📅', category: 'HABITO' as const },
    { name: 'Mentor', description: 'Ayuda a 3 compañeros', iconUrl: '👨‍🏫', category: 'IMPACTO_SOCIAL' as const },
    { name: 'Excelencia', description: 'Promedio superior a 4.5', iconUrl: '⭐', category: 'RENDIMIENTO' as const },
    { name: 'Velocista', description: 'Aprueba todo en primer intento', iconUrl: '🚀', category: 'PROGRESO' as const },
    { name: 'Especialista', description: '3 cursos con nota perfecta', iconUrl: '🏆', category: 'COMPETENCIA' as const }
  ]

  for (const badgeData of badgesData) {
    await prisma.badge.create({ data: badgeData })
  }

  console.log('✅ Insignias creadas')

  // Crear misiones de ejemplo
  const missionsData = [
    { title: 'Planificar Próximo Semestre', description: 'Crea un plan de estudio', type: 'PLANIFICACION' as const, pointsReward: 150 },
    { title: 'Completar Taller Práctico', description: 'Realiza el taller de bases de datos', type: 'ACADEMICO' as const, pointsReward: 200 },
    { title: 'Mejorar Promedio', description: 'Incrementa tu promedio 0.5 puntos', type: 'MEJORA_CONTINUA' as const, pointsReward: 250 },
    { title: 'Asistencia Perfecta', description: '5 clases sin faltar', type: 'HABITO_ESTUDIO' as const, pointsReward: 100 },
    { title: 'Mentorar Compañero', description: 'Ayuda a un compañero', type: 'IMPACTO_SOCIAL' as const, pointsReward: 300 }
  ]

  for (const missionData of missionsData) {
    await prisma.mission.create({ data: missionData })
  }

  console.log('✅ Misiones creadas')

  // Crear usuario demo
  const passwordHash = await bcrypt.hash('demo123', 10)
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@utb.edu.co',
      name: 'Juan Pérez',
      passwordHash,
      role: 'STUDENT',
      studentProfile: {
        create: {
          studentCode: '2019123456',
          programId: program.id,
          currentSemester: 6,
          admissionYear: 2019,
          totalCredits: 95,
          averageGrade: 4.2,
          level: 3
        }
      }
    }
  })

  console.log('✅ Usuario demo creado:', demoUser.email)

  console.log('🎉 Seed completado exitosamente!')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
