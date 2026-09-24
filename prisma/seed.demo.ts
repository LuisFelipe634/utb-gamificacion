import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

// ============================================================================
// UTB Gamificación - Seed DEMO realista (caso de prueba end-to-end)
// ----------------------------------------------------------------------------
// Archivo SEPARADO del seed base. Hace reset total (solo usar en entorno de
// pruebas) y deja un caso real completo para probar TODAS las funciones:
// login por roles, panel docente (2 docentes aislados), misiones manuales y
// automáticas en cada estado, canjes en cada estado, puntos/niveles/rachas,
// badges locales, notificaciones, recomendaciones y alertas de riesgo.
//
// NO toca nada de Meritcoin: los badges se prueban solo en flujo local.
//
// Uso: npm run db:seed:demo
// ============================================================================

const connectionString = process.env.DATABASE_URL!
console.log('🔗 Conectando a:', connectionString?.replace(/:([^@]+)@/, ':***@'))
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const DEMO_PASSWORD = 'demo123'

async function main() {
  console.log('🌱 Seed DEMO realista...')
  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${now.getMonth() < 6 ? 1 : 2}`
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)

  // ---- Limpieza total ------------------------------------------------------
  console.log('🧹 Limpiando datos existentes...')
  await prisma.studentReward.deleteMany()
  await prisma.reward.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.studentBadge.deleteMany()
  await prisma.studentMission.deleteMany()
  await prisma.point.deleteMany()
  await prisma.recommendation.deleteMany()
  await prisma.riskAlert.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.academicRecord.deleteMany()
  await prisma.studentProfile.deleteMany()
  await prisma.teacherCourse.deleteMany()
  await prisma.teacherProfile.deleteMany()
  await prisma.user.deleteMany()
  await prisma.prerequisite.deleteMany()
  await prisma.mission.deleteMany()
  await prisma.badge.deleteMany()
  await prisma.level.deleteMany()
  await prisma.course.deleteMany()
  await prisma.semester.deleteMany()
  await prisma.program.deleteMany()
  console.log('✅ Datos limpiados')

  // ---- Programa + malla ISCO 2019 (igual que seed base) --------------------
  const program = await prisma.program.create({
    data: { code: 'ISCO', name: 'Ingeniería de Sistemas', totalCredits: 162, totalSemesters: 10, version: '2019' },
  })

  const semestersData = [
    { number: 1, courses: [
      { code: 'H01A', name: 'Taller de Comprensión Lectora', credits: 3, type: 'GENERAL' as const, prereq: [] },
      { code: 'M01A', name: 'Cálculo Diferencial', credits: 4, type: 'OBLIGATORIO' as const, prereq: [] },
      { code: 'M02A', name: 'Matemáticas Básicas', credits: 2, type: 'OBLIGATORIO' as const, prereq: [] },
      { code: 'Q01A', name: 'Química General', credits: 3, type: 'GENERAL' as const, prereq: [] },
      { code: 'U01A', name: 'Desarrollo Universitario', credits: 0, type: 'GENERAL' as const, prereq: [] },
      { code: 'C01A', name: 'Seminario de Ingeniería de Sistemas y Computación', credits: 1, type: 'OBLIGATORIO' as const, prereq: [] },
      { code: 'C02A', name: 'Fundamentos de Programación', credits: 3, type: 'OBLIGATORIO' as const, prereq: [] },
    ]},
    { number: 2, courses: [
      { code: 'LE1A', name: 'Lengua Extranjera I', credits: 2, type: 'GENERAL' as const, prereq: [] },
      { code: 'F01A', name: 'Física Mecánica', credits: 4, type: 'OBLIGATORIO' as const, prereq: [] },
      { code: 'M03A', name: 'Cálculo Integral', credits: 4, type: 'OBLIGATORIO' as const, prereq: ['M01A', 'M02A'] },
      { code: 'M04A', name: 'Álgebra Lineal', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['M02A'] },
      { code: 'C03A', name: 'Programación', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C02A'] },
    ]},
    { number: 3, courses: [
      { code: 'LE2A', name: 'Lengua Extranjera II', credits: 2, type: 'GENERAL' as const, prereq: ['LE1A'] },
      { code: 'H02A', name: 'Taller de Escritura Académica', credits: 3, type: 'GENERAL' as const, prereq: ['H01A'] },
      { code: 'F02A', name: 'Física Electricidad y Magnetismo', credits: 4, type: 'OBLIGATORIO' as const, prereq: ['F01A'] },
      { code: 'M05A', name: 'Cálculo Vectorial', credits: 4, type: 'OBLIGATORIO' as const, prereq: ['M03A', 'M04A'] },
      { code: 'C04A', name: 'Programación Orientada a Objetos', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C03A'] },
    ]},
    { number: 4, courses: [
      { code: 'LE3A', name: 'Lengua Extranjera III', credits: 2, type: 'GENERAL' as const, prereq: ['LE2A'] },
      { code: 'H03A', name: 'Constitución Política', credits: 2, type: 'GENERAL' as const, prereq: [] },
      { code: 'M06A', name: 'Ecuaciones Diferenciales y en Diferencia', credits: 4, type: 'OBLIGATORIO' as const, prereq: ['M05A'] },
      { code: 'C05A', name: 'Estructura de Datos', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C04A'] },
      { code: 'C06A', name: 'Matemática Discreta', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['M02A'] },
    ]},
    { number: 5, courses: [
      { code: 'LE4A', name: 'Lengua Extranjera IV', credits: 2, type: 'GENERAL' as const, prereq: ['LE3A'] },
      { code: 'E01A', name: 'Estadística y Probabilidad', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['M04A'] },
      { code: 'A01A', name: 'Arquitectura de Software', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C05A'] },
      { code: 'A02A', name: 'Desarrollo de Software', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C05A'] },
      { code: 'A03A', name: 'Algoritmos y Complejidad', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C05A'] },
      { code: 'C07A', name: 'Base de Datos', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C05A'] },
    ]},
    { number: 6, courses: [
      { code: 'LE5A', name: 'Lengua Extranjera V', credits: 2, type: 'GENERAL' as const, prereq: ['LE4A'] },
      { code: 'E02A', name: 'Estadística Inferencial', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['E01A'] },
      { code: 'G04A', name: 'Creatividad y Emprendimiento', credits: 3, type: 'GENERAL' as const, prereq: [] },
      { code: 'A04A', name: 'Formulación y Evaluación de Proyectos', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['A02A'] },
      { code: 'C08A', name: 'Procesamiento Numérico', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['M05A'] },
      { code: 'C09A', name: 'Comunicaciones y Redes', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C07A'] },
    ]},
    { number: 7, courses: [
      { code: 'H05A', name: 'Ciudadanía Global', credits: 2, type: 'GENERAL' as const, prereq: [] },
      { code: 'M12A', name: 'Inteligencia Artificial', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['A03A'] },
      { code: 'A05A', name: 'Ingeniería de Software', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['A01A', 'A02A'] },
      { code: 'C10A', name: 'Arquitectura del Computador', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C09A'] },
      { code: 'EC1A', name: 'Electiva Complementaria I', credits: 3, type: 'ELECTIVA' as const, prereq: [] },
      { code: 'C11A', name: 'Sistemas Operativos', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C10A'] },
    ]},
    { number: 8, courses: [
      { code: 'HU1A', name: 'Electiva de Humanidades I', credits: 2, type: 'ELECTIVA' as const, prereq: [] },
      { code: 'A06A', name: 'Infraestructura para TI', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C10A'] },
      { code: 'A07A', name: 'Computación en Paralelo', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C11A'] },
      { code: 'EC2A', name: 'Electiva Complementaria II', credits: 3, type: 'ELECTIVA' as const, prereq: [] },
      { code: 'C12A', name: 'Tópicos Especiales de Ciencias Computacionales', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C11A'] },
      { code: 'P01A', name: 'Proyecto de Ingeniería I', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['A05A'] },
    ]},
    { number: 9, courses: [
      { code: 'HU2A', name: 'Electiva de Humanidades II', credits: 2, type: 'ELECTIVA' as const, prereq: [] },
      { code: 'EE1A', name: 'Electiva Empresarial', credits: 3, type: 'ELECTIVA' as const, prereq: [] },
      { code: 'A08A', name: 'Sistemas y Modelos', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['A05A'] },
      { code: 'EC3A', name: 'Electiva Complementaria III', credits: 3, type: 'ELECTIVA' as const, prereq: [] },
      { code: 'P02A', name: 'Proyecto de Ingeniería II', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['P01A'] },
      { code: 'EL1A', name: 'Electiva de Libre Elección', credits: 4, type: 'ELECTIVA' as const, prereq: [] },
    ]},
    { number: 10, courses: [
      { code: 'H04A', name: 'Ética', credits: 2, type: 'GENERAL' as const, prereq: [] },
      { code: 'EC4A', name: 'Electiva Complementaria IV', credits: 3, type: 'ELECTIVA' as const, prereq: [] },
      { code: 'P03A', name: 'Práctica Profesional', credits: 9, type: 'OBLIGATORIO' as const, prereq: ['P02A'] },
    ]},
  ]

  for (const semesterData of semestersData) {
    const semester = await prisma.semester.create({
      data: { programId: program.id, number: semesterData.number, name: `Semestre ${semesterData.number}` },
    })
    for (const courseData of semesterData.courses) {
      const { prereq, ...courseInfo } = courseData
      const course = await prisma.course.create({ data: { ...courseInfo, programId: program.id, semesterId: semester.id } })
      for (const prereqCode of prereq) {
        const prereqCourse = await prisma.course.findUnique({ where: { code: prereqCode } })
        if (prereqCourse) {
          await prisma.prerequisite.create({ data: { courseId: course.id, prerequisiteId: prereqCourse.id, type: 'REQUIRED' } })
        }
      }
    }
  }
  console.log('✅ Malla ISCO creada')

  for (const levelData of [
    { number: 1, name: 'Novato', minPoints: 0 },
    { number: 2, name: 'Aprendiz', minPoints: 500 },
    { number: 3, name: 'Explorador', minPoints: 1500 },
    { number: 4, name: 'Avanzado', minPoints: 3000 },
    { number: 5, name: 'Maestro', minPoints: 5000 },
    { number: 6, name: 'Leyenda', minPoints: 8000 },
  ]) {
    await prisma.level.create({ data: levelData })
  }

  for (const rewardData of [
    { name: 'Exoneración de Parcial', description: 'Exonerarse de presentar un examen parcial (sujeto a aprobación docente).', icon: '📝', category: 'EXAMEN' as const, cost: 2000, maxUses: 1 },
    { name: 'Mejora de Nota Parcial', description: 'Aumentar la nota de un parcial en 0.5 (máximo 5.0).', icon: '📈', category: 'EXAMEN' as const, cost: 1500, maxUses: 2 },
    { name: 'Limpieza de Inasistencia', description: 'Eliminar una inasistencia registrada. Máximo 1 por semestre.', icon: '✅', category: 'ASISTENCIA' as const, cost: 800, maxUses: 1 },
    { name: 'Extensión de Entrega', description: '48 horas extra para entregar un trabajo. Una vez por curso.', icon: '⏰', category: 'ENTREGA' as const, cost: 500, maxUses: 1 },
    { name: 'Reintento de Quiz', description: 'Volver a presentar un quiz para mejorar la nota.', icon: '🔄', category: 'ENTREGA' as const, cost: 600, maxUses: 2 },
    { name: 'Asesoría Personalizada', description: 'Sesión de 30 minutos con el docente acompañante.', icon: '👨‍🏫', category: 'OTRO' as const, cost: 1000, maxUses: 1 },
  ]) {
    await prisma.reward.create({ data: rewardData })
  }

  // Misiones del seed base + 2 MANUALES (autoVerify false) para probar revisión docente
  const missionsData: { title: string; description: string; type: 'ACADEMICO' | 'PLANIFICACION' | 'MEJORA_CONTINUA' | 'HABITO_ESTUDIO' | 'IMPACTO_SOCIAL'; pointsReward: number; autoVerify: boolean; verificationKey?: string; verificationValue?: string }[] = [
    { title: 'Planificar Próximo Semestre', description: 'Selecciona materias disponibles sin superar 18 créditos.', type: 'PLANIFICACION', pointsReward: 150, autoVerify: true },
    { title: 'Explorar tu Malla', description: 'Consulta materias de al menos tres semestres.', type: 'ACADEMICO', pointsReward: 50, autoVerify: true },
    { title: 'Revisar tu Progreso', description: 'Consulta tus estadísticas académicas de la semana.', type: 'ACADEMICO', pointsReward: 50, autoVerify: true },
    { title: 'Constancia Académica', description: 'Ingresa a la plataforma cuatro días diferentes durante la semana.', type: 'HABITO_ESTUDIO', pointsReward: 100, autoVerify: true },
    { title: 'Completar un Quiz', description: 'Obtén al menos 70% en un cuestionario académico.', type: 'ACADEMICO', pointsReward: 100, autoVerify: true },
    { title: 'Mantener una racha de 7 días accediendo', description: 'Registra actividad 7 días consecutivos.', type: 'HABITO_ESTUDIO', pointsReward: 200, autoVerify: true, verificationKey: 'RACHA_7_DIAS_ACCESO' },
    { title: 'Completar 3 misiones en una semana', description: 'Completa 3 misiones dentro de una ventana de 7 días.', type: 'MEJORA_CONTINUA', pointsReward: 250, autoVerify: true, verificationKey: 'COMPLETAR_3_MISIONES_SEMANA' },
    { title: 'Revisar las notificaciones pendientes', description: 'Deja en cero tus notificaciones sin leer.', type: 'HABITO_ESTUDIO', pointsReward: 150, autoVerify: true, verificationKey: 'SIN_NOTIFICACIONES_PENDIENTES' },
    { title: 'Aprobar 6 créditos este semestre', description: 'Aprueba al menos 6 créditos durante el período actual.', type: 'ACADEMICO', pointsReward: 200, autoVerify: true, verificationKey: 'APROBAR_CREDITOS_SEMESTRE', verificationValue: '6' },
    { title: 'Mejorar tu promedio en 0.5 puntos', description: 'Sube tu promedio al menos 0.5 puntos respecto al inicio del período.', type: 'ACADEMICO', pointsReward: 250, autoVerify: true, verificationKey: 'MEJORAR_PROMEDIO', verificationValue: '0.5' },
    { title: 'Cero reprobados en el semestre', description: 'No registrar ninguna materia reprobada en el semestre actual.', type: 'ACADEMICO', pointsReward: 200, autoVerify: true, verificationKey: 'CERO_REPROBADOS' },
    { title: 'Completar prerrequisitos de Programación Orientada a Objetos', description: 'Aprueba todos los prerrequisitos del curso C04A.', type: 'PLANIFICACION', pointsReward: 150, autoVerify: true, verificationKey: 'COMPLETAR_PREREQUISITOS', verificationValue: 'C04A' },
    { title: 'Avanzar al siguiente semestre', description: 'Acumula los créditos necesarios para avanzar de semestre.', type: 'ACADEMICO', pointsReward: 180, autoVerify: true, verificationKey: 'AVANZAR_SEMESTRE' },
    { title: 'Ensayo de proyecto integrador', description: 'Entrega un ensayo de 3 páginas sobre tu proyecto integrador. Revisión manual del docente.', type: 'ACADEMICO', pointsReward: 300, autoVerify: false },
    { title: 'Bitácora semanal de estudio', description: 'Entrega tu bitácora de estudio de la semana. Revisión manual del docente.', type: 'HABITO_ESTUDIO', pointsReward: 120, autoVerify: false },
  ]
  const missionByTitle = new Map<string, { id: string }>()
  for (const missionData of missionsData) {
    const created = await prisma.mission.create({ data: missionData })
    missionByTitle.set(missionData.title, created)
  }
  console.log('✅ Catálogos creados (misiones incluyen 2 manuales)')

  // ---- Badges locales (sin Meritcoin) --------------------------------------
  for (const badgeData of [
    { name: 'Primera Misión', description: 'Completa tu primera misión.', iconUrl: '🎯', category: 'PROGRESO' as const },
    { name: 'Racha Imparable', description: '7 días consecutivos de actividad.', iconUrl: '🔥', category: 'HABITO' as const, pointsRequired: 200 },
    { name: 'Excelencia Académica', description: 'Promedio ponderado de 4.5 o más.', iconUrl: '🌟', category: 'RENDIMIENTO' as const, requiredLevel: 3 },
    { name: 'Explorador Curricular', description: 'Consulta a fondo tu malla curricular.', iconUrl: '🧭', category: 'PROGRESO' as const },
    { name: 'Mentor Comunitario', description: 'Participa en actividades de impacto social.', iconUrl: '🤝', category: 'IMPACTO_SOCIAL' as const },
    { name: 'Especialista en Código', description: 'Domina los fundamentos de programación.', iconUrl: '💻', category: 'COMPETENCIA' as const },
  ]) {
    await prisma.badge.create({ data: badgeData })
  }
  console.log('✅ Badges creados')

  // ---- Usuarios -------------------------------------------------------------
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  const createStudent = (email: string, name: string, profile: { studentCode: string; meritcoinStudentId: string; currentSemester: number; admissionYear: number; totalCredits: number; averageGrade: number; level: number }) =>
    prisma.user.create({
      data: { email, name, passwordHash, role: 'STUDENT', studentProfile: { create: { ...profile, programId: program.id } } },
      include: { studentProfile: true },
    })

  const teacher1 = await prisma.user.create({
    data: { email: 'docente@utb.edu.co', name: 'María González', passwordHash, role: 'TEACHER',
      teacherProfile: { create: { department: 'Ingeniería de Sistemas', faculty: 'Facultad de Ingeniería', profession: 'Ingeniera de Sistemas', title: 'Docente acompañante', isActive: true } } },
    include: { teacherProfile: true },
  })
  const teacher2 = await prisma.user.create({
    data: { email: 'carlos.ruiz@utb.edu.co', name: 'Carlos Ruiz', passwordHash, role: 'TEACHER',
      teacherProfile: { create: { department: 'Matemáticas y Ciencias', faculty: 'Facultad de Ingeniería', profession: 'Matemático', title: 'Docente de ciencias básicas', isActive: true } } },
    include: { teacherProfile: true },
  })

  // Laura: avanzada sem 6, 1520 pts netos (Explorador: supera el umbral 1500), repite C04A tras reprobarla
  const laura = await createStudent('laura.avanzado@utb.edu.co', 'Laura Avanzado', { studentCode: '2022123456', meritcoinStudentId: 'STU-10', currentSemester: 6, admissionYear: 2022, totalCredits: 73, averageGrade: 4.2, level: 3 })
  // Diego: en riesgo sem 4 (promedio 2.8 + rezago de créditos + 1 reprobado actual)
  const diego = await createStudent('diego.riesgo@utb.edu.co', 'Diego Riesgo', { studentCode: '2023123457', meritcoinStudentId: 'STU-11', currentSemester: 4, admissionYear: 2023, totalCredits: 41, averageGrade: 2.8, level: 2 })
  // Sofía: nueva sem 2, cuenta limpia para probar onboarding
  const sofia = await createStudent('sofia.nueva@utb.edu.co', 'Sofía Nueva', { studentCode: '2024123458', meritcoinStudentId: 'STU-12', currentSemester: 2, admissionYear: 2024, totalCredits: 16, averageGrade: 3.8, level: 1 })
  // Miguel: solo ve docente2 (aislamiento entre docentes)
  const miguel = await createStudent('miguel.torres@utb.edu.co', 'Miguel Torres', { studentCode: '2023123459', meritcoinStudentId: 'STU-13', currentSemester: 3, admissionYear: 2023, totalCredits: 28, averageGrade: 3.6, level: 2 })
  console.log('✅ Usuarios creados (2 docentes + 4 estudiantes)')

  // ---- Asignación docente ----------------------------------------------------
  const courseByCode = new Map((await prisma.course.findMany()).map((c) => [c.code, c]))
  const assign = (teacherProfileId: string, codes: string[]) =>
    Promise.all(codes.map((code) => prisma.teacherCourse.create({ data: { teacherId: teacherProfileId, courseId: courseByCode.get(code)!.id, period: currentPeriod } })))
  await assign(teacher1.teacherProfile!.id, ['C02A', 'C03A', 'C04A', 'C05A'])
  await assign(teacher2.teacherProfile!.id, ['M01A', 'M03A', 'A02A'])
  console.log('✅ Cursos asignados a docentes')

  // ---- Matrículas ------------------------------------------------------------
  const allCourses = await prisma.course.findMany({ include: { semester: true } })
  const grades = [4.3, 4.0, 3.7, 4.5, 4.1, 3.9]
  let gi = 0
  const historyGrade = () => grades[gi++ % grades.length]

  const enrollHistory = async (profileId: string, maxSemester: number, opts: { exclude?: string[]; failed?: Record<string, number> } = {}) => {
    for (const course of allCourses) {
      const sem = course.semester.number
      if (sem > maxSemester || opts.exclude?.includes(course.code)) continue
      const failedGrade = opts.failed?.[course.code]
      await prisma.enrollment.create({
        data: {
          studentId: profileId, courseId: course.id,
          semesterCode: `${2020 + sem}-1`,
          status: failedGrade !== undefined ? 'REPROBADO' : 'APROBADO',
          grade: failedGrade ?? historyGrade(),
        },
      })
    }
  }
  const enrollCurrent = async (profileId: string, code: string, status: 'CURSANDO' | 'APROBADO' | 'REPROBADO', grade: number | null) =>
    prisma.enrollment.create({ data: { studentId: profileId, courseId: courseByCode.get(code)!.id, semesterCode: currentPeriod, status, grade } })

  // Laura: sem 1-5 aprobados excepto C04A (reprobada, la repite ahora) y C05A (primera vez ahora)
  await enrollHistory(laura.studentProfile!.id, 5, { exclude: ['C05A'], failed: { C04A: 2.6 } })
  await enrollCurrent(laura.studentProfile!.id, 'C04A', 'CURSANDO', null)
  await enrollCurrent(laura.studentProfile!.id, 'C05A', 'CURSANDO', null)
  await enrollCurrent(laura.studentProfile!.id, 'C08A', 'APROBADO', 4.0)
  await enrollCurrent(laura.studentProfile!.id, 'E02A', 'APROBADO', 4.2)
  // Diego: sem 1-2 + parcial 3 (M05A reprobada); cursa C03A y reprueba C06A en actual
  await enrollHistory(diego.studentProfile!.id, 2)
  for (const code of ['LE2A', 'H02A', 'F02A']) await prisma.enrollment.create({ data: { studentId: diego.studentProfile!.id, courseId: courseByCode.get(code)!.id, semesterCode: '2023-1', status: 'APROBADO', grade: 3.1 } })
  await prisma.enrollment.create({ data: { studentId: diego.studentProfile!.id, courseId: courseByCode.get('M05A')!.id, semesterCode: '2023-1', status: 'REPROBADO', grade: 2.9 } })
  await enrollCurrent(diego.studentProfile!.id, 'C03A', 'CURSANDO', null)
  await enrollCurrent(diego.studentProfile!.id, 'H03A', 'CURSANDO', null)
  await enrollCurrent(diego.studentProfile!.id, 'C06A', 'REPROBADO', 2.4)
  // Sofía: sem 1 aprobado, cursa C03A
  await enrollHistory(sofia.studentProfile!.id, 1)
  await enrollCurrent(sofia.studentProfile!.id, 'C03A', 'CURSANDO', null)
  // Miguel: sem 1-2 con M03A reprobada (la repite con docente2)
  await enrollHistory(miguel.studentProfile!.id, 2, { failed: { M03A: 2.7 } })
  await enrollCurrent(miguel.studentProfile!.id, 'M03A', 'CURSANDO', null)
  console.log('✅ Matrículas creadas')

  // ---- Puntos (libro mayor de Laura: total 1520 netos) -----------------------
  const lauraPoints: { amount: number; source: 'MISION_COMPLETADA' | 'RENDIMIENTO_ACADEMICO' | 'MEJORA_PROMEDIO' | 'CONSISTENCIA' | 'IMPACTO_SOCIAL' | 'EVENTO_ESPECIAL'; description: string }[] = [
    { amount: 150, source: 'MISION_COMPLETADA', description: 'Misión completada: Planificar Próximo Semestre' },
    { amount: 50, source: 'MISION_COMPLETADA', description: 'Misión completada: Explorar tu Malla' },
    { amount: 100, source: 'MISION_COMPLETADA', description: 'Misión completada: Completar un Quiz' },
    { amount: 120, source: 'MISION_COMPLETADA', description: 'Misión verificada: Bitácora semanal de estudio' },
    { amount: 500, source: 'RENDIMIENTO_ACADEMICO', description: 'Promedio destacado 4.2' },
    { amount: 300, source: 'MEJORA_PROMEDIO', description: 'Subida de promedio +0.4' },
    { amount: 200, source: 'CONSISTENCIA', description: 'Racha de 7 días de actividad' },
    { amount: 800, source: 'EVENTO_ESPECIAL', description: 'Hackatón UTB 2026' },
    { amount: 600, source: 'IMPACTO_SOCIAL', description: 'Voluntariado comunitario' },
    { amount: -500, source: 'MISION_COMPLETADA', description: 'Canje: Extensión de Entrega' },
    { amount: -800, source: 'MISION_COMPLETADA', description: 'Canje: Limpieza de Inasistencia' },
    { amount: -600, source: 'MISION_COMPLETADA', description: 'Canje: Reintento de Quiz' },
    { amount: 600, source: 'MISION_COMPLETADA', description: 'Reembolso: Reintento de Quiz (rechazado por docente)' },
  ]
  for (const p of lauraPoints) await prisma.point.create({ data: { userId: laura.id, ...p } })
  await prisma.point.create({ data: { userId: diego.id, amount: 150, source: 'MISION_COMPLETADA', description: 'Misión completada: Explorar tu Malla' } })
  await prisma.point.create({ data: { userId: diego.id, amount: 100, source: 'CONSISTENCIA', description: 'Racha de 2 días' } })
  await prisma.point.create({ data: { userId: miguel.id, amount: 350, source: 'MISION_COMPLETADA', description: 'Misión completada: Revisar tu Progreso' } })
  console.log('✅ Puntos creados')

  // ---- Misiones de estudiantes (todos los estados) ---------------------------
  const M = (title: string) => missionByTitle.get(title)!.id
  // Laura: 3 COMPLETADA (ventana 7d) + 1 VERIFICADA + 2 EN_REVISION? No: 1 EN_REVISION + 1 EN_PROGRESO + 1 PENDIENTE
  for (const [title, ago] of [['Planificar Próximo Semestre', 1], ['Explorar tu Malla', 3], ['Completar un Quiz', 5]] as const) {
    await prisma.studentMission.create({ data: { studentId: laura.id, missionId: M(title), status: 'COMPLETADA', progress: 100, completedAt: daysAgo(ago) } })
  }
  await prisma.studentMission.create({ data: { studentId: laura.id, missionId: M('Bitácora semanal de estudio'), status: 'VERIFICADA', progress: 100, evidence: 'Bitácora semana 12.pdf', completedAt: daysAgo(7), verifiedBy: teacher1.id, verifiedAt: daysAgo(6) } })
  await prisma.studentMission.create({ data: { studentId: laura.id, missionId: M('Ensayo de proyecto integrador'), status: 'EN_REVISION', progress: 100, evidence: 'Ensayo_proyecto_integrador.pdf', completedAt: now } })
  await prisma.studentMission.create({ data: { studentId: laura.id, missionId: M('Mantener una racha de 7 días accediendo'), status: 'EN_PROGRESO', progress: 85 } })
  await prisma.studentMission.create({ data: { studentId: laura.id, missionId: M('Completar 3 misiones en una semana'), status: 'PENDIENTE', progress: 0 } })
  // Diego: 1 EN_REVISION + 1 RECHAZADA con comentario (visible en /misiones)
  await prisma.studentMission.create({ data: { studentId: diego.id, missionId: M('Ensayo de proyecto integrador'), status: 'EN_REVISION', progress: 100, evidence: 'ensayo_borrador.docx', completedAt: now } })
  await prisma.studentMission.create({ data: { studentId: diego.id, missionId: M('Bitácora semanal de estudio'), status: 'RECHAZADA', progress: 100, evidence: 'bitácora incompleta', completedAt: daysAgo(2), verifiedBy: teacher1.id, verifiedAt: daysAgo(1), reviewComment: 'Faltan 2 días de registro. Completa la semana y reenvía.' } })
  // Sofía: cuenta limpia con 1 aceptada (flujo accept→start→complete por probar)
  await prisma.studentMission.create({ data: { studentId: sofia.id, missionId: M('Planificar Próximo Semestre'), status: 'PENDIENTE', progress: 0 } })
  // Miguel: en progreso (docente2 lo verá en su panel)
  await prisma.studentMission.create({ data: { studentId: miguel.id, missionId: M('Mantener una racha de 7 días accediendo'), status: 'EN_PROGRESO', progress: 40 } })
  console.log('✅ Misiones de estudiantes creadas')

  // ---- Canjes (SOLICITADO + APROBADO + RECHAZADO) -----------------------------
  const rewardByName = new Map((await prisma.reward.findMany()).map((r) => [r.name, r]))
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  // Laura: 1 pendiente + 1 aprobado + 1 rechazado (rewards DISTINTOS por el unique)
  await prisma.studentReward.create({ data: { studentId: laura.id, rewardId: rewardByName.get('Extensión de Entrega')!.id, courseId: courseByCode.get('C04A')!.id, status: 'SOLICITADO', pointsSpent: 500, evidence: 'Captura del avance del proyecto', expiresAt } })
  await prisma.studentReward.create({ data: { studentId: laura.id, rewardId: rewardByName.get('Limpieza de Inasistencia')!.id, courseId: courseByCode.get('C05A')!.id, status: 'APROBADO', pointsSpent: 800, requestedAt: daysAgo(8), reviewedAt: daysAgo(6), reviewedBy: teacher1.id, reviewNote: 'Aprobado. Recuerda asistir a las próximas sesiones.', expiresAt } })
  await prisma.studentReward.create({ data: { studentId: laura.id, rewardId: rewardByName.get('Reintento de Quiz')!.id, courseId: courseByCode.get('C04A')!.id, status: 'RECHAZADO', pointsSpent: 600, requestedAt: daysAgo(10), reviewedAt: daysAgo(9), reviewedBy: teacher1.id, reviewNote: 'Ya usaste tus intentos del corte. Puntos reembolsados.', expiresAt } })
  // Diego: 1 pendiente para que docente1 tenga 2 canjes por revisar
  await prisma.studentReward.create({ data: { studentId: diego.id, rewardId: rewardByName.get('Reintento de Quiz')!.id, courseId: courseByCode.get('C03A')!.id, status: 'SOLICITADO', pointsSpent: 600, evidence: 'Foto del quiz 2', expiresAt } })
  console.log('✅ Canjes creados')

  // ---- Badges ganados ----------------------------------------------------------
  const badgeByName = new Map((await prisma.badge.findMany()).map((b) => [b.name, b]))
  await prisma.studentBadge.create({ data: { studentId: laura.id, badgeId: badgeByName.get('Primera Misión')!.id, earnedAt: daysAgo(5) } })
  await prisma.studentBadge.create({ data: { studentId: laura.id, badgeId: badgeByName.get('Racha Imparable')!.id, earnedAt: daysAgo(1) } })
  await prisma.studentBadge.create({ data: { studentId: diego.id, badgeId: badgeByName.get('Primera Misión')!.id, earnedAt: daysAgo(12) } })
  console.log('✅ Badges otorgados')

  // ---- Notificaciones ------------------------------------------------------------
  await prisma.notification.create({ data: { userId: laura.id, title: 'Ruta recomendada urgente de tu docente', message: 'Tu docente María González te sugiere priorizar C04A · Programación Orientada a Objetos y C05A · Estructura de Datos este período. Revisa tu malla.', type: 'ALERTA_RIESGO', link: '/malla' } })
  await prisma.notification.create({ data: { userId: laura.id, title: '¡Insignia obtenida: Racha Imparable!', message: 'Completaste 7 días consecutivos de actividad. Sigue así.', type: 'LOGRO_OBTENIDO', link: '/logros' } })
  await prisma.notification.create({ data: { userId: laura.id, title: 'Bienvenido a UTB Gamificación', message: 'Explora tu malla y acepta tu primera misión.', type: 'INFO', isRead: true } })
  await prisma.notification.create({ data: { userId: teacher1.id, title: 'Nueva solicitud de canje: Extensión de Entrega', message: 'Laura Avanzado solicita Extensión de Entrega en C04A (500 pts).', type: 'SOLICITUD_RECOMPENSA', link: '/docentes?section=recompensas' } })
  await prisma.notification.create({ data: { userId: diego.id, title: 'Tu promedio necesita atención', message: 'Tu promedio actual es 2.8. Agenda una asesoría con tu docente.', type: 'WARNING' } })
  await prisma.notification.create({ data: { userId: sofia.id, title: 'Nuevas misiones disponibles', message: 'Tienes misiones de planificación esperándote.', type: 'MISION_DISPONIBLE', link: '/misiones' } })
  console.log('✅ Notificaciones creadas')

  // ---- Actividad (rachas: Laura 7 días, Diego 2, Sofía hoy) -----------------------
  for (let d = 6; d >= 0; d--) {
    await prisma.activity.create({ data: { userId: laura.id, action: 'ACADEMIC_DAILY_ACTIVITY', createdAt: daysAgo(d) } })
    await prisma.activity.create({ data: { userId: laura.id, action: 'LOGIN', createdAt: daysAgo(d) } })
  }
  for (let d = 1; d >= 0; d--) {
    await prisma.activity.create({ data: { userId: diego.id, action: 'ACADEMIC_DAILY_ACTIVITY', createdAt: daysAgo(d) } })
  }
  await prisma.activity.create({ data: { userId: sofia.id, action: 'ACADEMIC_DAILY_ACTIVITY' } })
  console.log('✅ Actividad creada')

  // ---- Alerta de riesgo persistente (Diego) ---------------------------------------
  await prisma.riskAlert.create({ data: { studentId: diego.studentProfile!.id, type: 'BAJO_PROMEDIO', severity: 'ALTA', title: 'Promedio en riesgo', description: 'Promedio 2.8 por debajo del umbral de 3.0. Requiere acompañamiento.' } })
  console.log('✅ Alerta de riesgo creada')

  console.log('\n🎉 Seed DEMO completado. Credenciales (contraseña: demo123):')
  console.table([
    { rol: 'TEACHER', email: 'docente@utb.edu.co', uso: 'Ve a Laura, Diego y Sofía (C02A-C05A)' },
    { rol: 'TEACHER', email: 'carlos.ruiz@utb.edu.co', uso: 'Ve solo a Miguel (M01A, M03A, A02A)' },
    { rol: 'STUDENT', email: 'laura.avanzado@utb.edu.co', uso: 'Caso avanzado: 1520 pts, historial completo' },
    { rol: 'STUDENT', email: 'diego.riesgo@utb.edu.co', uso: 'Caso riesgo: flag En riesgo + reprobado actual' },
    { rol: 'STUDENT', email: 'sofia.nueva@utb.edu.co', uso: 'Caso limpio: onboarding desde cero' },
    { rol: 'STUDENT', email: 'miguel.torres@utb.edu.co', uso: 'Caso aislamiento docente2' },
  ])
}

main()
  .catch((e) => { console.error('❌ Error durante el seed DEMO:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
