import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL!

/**
 * Destino de la conexion sin credenciales: solo protocolo, host, puerto y base.
 * No se loguea la URL cruda porque al enmascarar con un regex se filtra
 * cualquier clave que contenga "@" y no se cubren los query params
 * (?sslpassword=, ?password=).
 */
function destinoSeguro(url: string | undefined): string {
  if (!url) return 'DATABASE_URL no definida'
  try {
    const { protocol, hostname, port, pathname } = new URL(url)
    return `${protocol}//${hostname}${port ? `:${port}` : ''}${pathname}`
  } catch {
    return 'DATABASE_URL no parseable (omitida por seguridad)'
  }
}

console.log('🔗 Conectando a:', destinoSeguro(connectionString))
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')
  const currentPeriod = `${new Date().getFullYear()}-${new Date().getMonth() < 6 ? 1 : 2}`

  // Limpiar datos existentes (si los hay)
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

  // Crear programa
  const program = await prisma.program.create({
    data: {
      code: 'ISCO',
      name: 'Ingeniería de Sistemas',
        totalCredits: 162,
      totalSemesters: 10,
      version: '2019'
    }
  })

  console.log('✅ Programa creado:', program.name)

  // Malla del plan 2019: 10 niveles, 55 cursos y 162 créditos.
  const semestersData = [
    {
      number: 1,
      courses: [
          { code: 'H01A', name: 'Taller de Comprensión Lectora', credits: 3, type: 'GENERAL' as const, prereq: [] },
          { code: 'M01A', name: 'Cálculo Diferencial', credits: 4, type: 'OBLIGATORIO' as const, prereq: [] },
          { code: 'M02A', name: 'Matemáticas Básicas', credits: 2, type: 'OBLIGATORIO' as const, prereq: [] },
          { code: 'Q01A', name: 'Química General', credits: 3, type: 'GENERAL' as const, prereq: [] },
          { code: 'U01A', name: 'Desarrollo Universitario', credits: 0, type: 'GENERAL' as const, prereq: [] },
          { code: 'C01A', name: 'Seminario de Ingeniería de Sistemas y Computación', credits: 1, type: 'OBLIGATORIO' as const, prereq: [] },
          { code: 'C02A', name: 'Fundamentos de Programación', credits: 3, type: 'OBLIGATORIO' as const, prereq: [] }
      ]
    },
    {
      number: 2,
      courses: [
          { code: 'LE1A', name: 'Lengua Extranjera I', credits: 2, type: 'GENERAL' as const, prereq: [] },
          { code: 'F01A', name: 'Física Mecánica', credits: 4, type: 'OBLIGATORIO' as const, prereq: [] },
          { code: 'M03A', name: 'Cálculo Integral', credits: 4, type: 'OBLIGATORIO' as const, prereq: ['M01A', 'M02A'] },
          { code: 'M04A', name: 'Álgebra Lineal', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['M02A'] },
          { code: 'C03A', name: 'Programación', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C02A'] }
      ]
    },
    {
      number: 3,
      courses: [
          { code: 'LE2A', name: 'Lengua Extranjera II', credits: 2, type: 'GENERAL' as const, prereq: ['LE1A'] },
          { code: 'H02A', name: 'Taller de Escritura Académica', credits: 3, type: 'GENERAL' as const, prereq: ['H01A'] },
          { code: 'F02A', name: 'Física Electricidad y Magnetismo', credits: 4, type: 'OBLIGATORIO' as const, prereq: ['F01A'] },
          { code: 'M05A', name: 'Cálculo Vectorial', credits: 4, type: 'OBLIGATORIO' as const, prereq: ['M03A', 'M04A'] },
          { code: 'C04A', name: 'Programación Orientada a Objetos', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C03A'] }
      ]
      },
      {
        number: 4,
        courses: [
          { code: 'LE3A', name: 'Lengua Extranjera III', credits: 2, type: 'GENERAL' as const, prereq: ['LE2A'] },
          { code: 'H03A', name: 'Constitución Política', credits: 2, type: 'GENERAL' as const, prereq: [] },
          { code: 'M06A', name: 'Ecuaciones Diferenciales y en Diferencia', credits: 4, type: 'OBLIGATORIO' as const, prereq: ['M05A'] },
          { code: 'C05A', name: 'Estructura de Datos', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C04A'] },
          { code: 'C06A', name: 'Matemática Discreta', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['M02A'] }
        ]
      },
      {
        number: 5,
        courses: [
          { code: 'LE4A', name: 'Lengua Extranjera IV', credits: 2, type: 'GENERAL' as const, prereq: ['LE3A'] },
          { code: 'E01A', name: 'Estadística y Probabilidad', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['M04A'] },
          { code: 'A01A', name: 'Arquitectura de Software', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C05A'] },
          { code: 'A02A', name: 'Desarrollo de Software', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C05A'] },
          { code: 'A03A', name: 'Algoritmos y Complejidad', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C05A'] },
          { code: 'C07A', name: 'Base de Datos', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C05A'] }
        ]
      },
      {
        number: 6,
        courses: [
          { code: 'LE5A', name: 'Lengua Extranjera V', credits: 2, type: 'GENERAL' as const, prereq: ['LE4A'] },
          { code: 'E02A', name: 'Estadística Inferencial', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['E01A'] },
          { code: 'G04A', name: 'Creatividad y Emprendimiento', credits: 3, type: 'GENERAL' as const, prereq: [] },
          { code: 'A04A', name: 'Formulación y Evaluación de Proyectos', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['A02A'] },
          { code: 'C08A', name: 'Procesamiento Numérico', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['M05A'] },
          { code: 'C09A', name: 'Comunicaciones y Redes', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C07A'] }
        ]
      },
      {
        number: 7,
        courses: [
          { code: 'H05A', name: 'Ciudadanía Global', credits: 2, type: 'GENERAL' as const, prereq: [] },
          { code: 'M12A', name: 'Inteligencia Artificial', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['A03A'] },
          { code: 'A05A', name: 'Ingeniería de Software', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['A01A', 'A02A'] },
          { code: 'C10A', name: 'Arquitectura del Computador', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C09A'] },
          { code: 'EC1A', name: 'Electiva Complementaria I', credits: 3, type: 'ELECTIVA' as const, prereq: [] },
          { code: 'C11A', name: 'Sistemas Operativos', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C10A'] }
        ]
      },
      {
        number: 8,
        courses: [
          { code: 'HU1A', name: 'Electiva de Humanidades I', credits: 2, type: 'ELECTIVA' as const, prereq: [] },
          { code: 'A06A', name: 'Infraestructura para TI', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C10A'] },
          { code: 'A07A', name: 'Computación en Paralelo', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C11A'] },
          { code: 'EC2A', name: 'Electiva Complementaria II', credits: 3, type: 'ELECTIVA' as const, prereq: [] },
          { code: 'C12A', name: 'Tópicos Especiales de Ciencias Computacionales', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['C11A'] },
          { code: 'P01A', name: 'Proyecto de Ingeniería I', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['A05A'] }
        ]
      },
      {
        number: 9,
        courses: [
          { code: 'HU2A', name: 'Electiva de Humanidades II', credits: 2, type: 'ELECTIVA' as const, prereq: [] },
          { code: 'EE1A', name: 'Electiva Empresarial', credits: 3, type: 'ELECTIVA' as const, prereq: [] },
          { code: 'A08A', name: 'Sistemas y Modelos', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['A05A'] },
          { code: 'EC3A', name: 'Electiva Complementaria III', credits: 3, type: 'ELECTIVA' as const, prereq: [] },
          { code: 'P02A', name: 'Proyecto de Ingeniería II', credits: 3, type: 'OBLIGATORIO' as const, prereq: ['P01A'] },
          { code: 'EL1A', name: 'Electiva de Libre Elección', credits: 4, type: 'ELECTIVA' as const, prereq: [] }
        ]
      },
      {
        number: 10,
        courses: [
          { code: 'H04A', name: 'Ética', credits: 2, type: 'GENERAL' as const, prereq: [] },
          { code: 'EC4A', name: 'Electiva Complementaria IV', credits: 3, type: 'ELECTIVA' as const, prereq: [] },
          { code: 'P03A', name: 'Práctica Profesional', credits: 9, type: 'OBLIGATORIO' as const, prereq: ['P02A'] }
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

  // ============================================
// Crear recompensas / bonificaciones
// ============================================

  console.log('🎁 Creando recompensas...')

  const rewardsData = [
    {
      name: "Exoneración de Parcial",
      description: "Exonerarse de presentar un examen parcial (sujeto a aprobación docente). No aplica a exámenes finales.",
      icon: "📝",
      category: "EXAMEN" as const,
      cost: 2000,
      maxUses: 1,
    },
    {
      name: "Mejora de Nota Parcial",
      description: "Aumentar la nota de un examen parcial en 0.5 puntos (máximo hasta 5.0). Requiere aprobación del docente.",
      icon: "📈",
      category: "EXAMEN" as const,
      cost: 1500,
      maxUses: 2,
    },
    {
      name: "Limpieza de Inasistencia",
      description: "Eliminar una inasistencia registrada en el curso actual. Máximo 1 por semestre.",
      icon: "✅",
      category: "ASISTENCIA" as const,
      cost: 800,
      maxUses: 1,
    },
    {
      name: "Extensión de Entrega",
      description: "Obtener 48 horas extra para entregar un trabajo o proyecto. Una vez por curso.",
      icon: "⏰",
      category: "ENTREGA" as const,
      cost: 500,
      maxUses: 1,
    },
    {
      name: "Reintento de Quiz",
      description: "Volver a presentar un cuestionario/quiz para mejorar la nota. Sujeto a disponibilidad del docente.",
      icon: "🔄",
      category: "ENTREGA" as const,
      cost: 600,
      maxUses: 2,
    },
    {
      name: "Asesoría Personalizada",
      description: "Sesión de 30 minutos con el docente acompañante para revisar dudas o planificar el semestre.",
      icon: "👨‍🏫",
      category: "OTRO" as const,
      cost: 1000,
      maxUses: 1,
    },
  ]

  for (const rewardData of rewardsData) {
    await prisma.reward.create({ data: rewardData })
  }

  console.log('✅ Recompensas creadas')

  // Crear misiones de ejemplo
  const missionsData = [
     { title: 'Planificar Próximo Semestre', description: 'Selecciona materias disponibles sin superar 18 créditos.', type: 'PLANIFICACION' as const, pointsReward: 150, autoVerify: true },
     { title: 'Explorar tu Malla', description: 'Consulta materias de al menos tres semestres.', type: 'ACADEMICO' as const, pointsReward: 50, autoVerify: true },
     { title: 'Revisar tu Progreso', description: 'Consulta tus estadísticas académicas de la semana.', type: 'ACADEMICO' as const, pointsReward: 50, autoVerify: true },
     { title: 'Constancia Académica', description: 'Ingresa a la plataforma cuatro días diferentes durante la semana.', type: 'HABITO_ESTUDIO' as const, pointsReward: 100, autoVerify: true },
     { title: 'Completar un Quiz', description: 'Obtén al menos 70% en un cuestionario académico.', type: 'ACADEMICO' as const, pointsReward: 100, autoVerify: true },
     { title: 'Mantener una racha de 7 días accediendo', description: 'Registra diariamente una actividad con action = LOGIN o PAGE_VIEW:/dashboard y comprueba 7 días consecutivos.', type: 'HABITO_ESTUDIO' as const, pointsReward: 200, autoVerify: true, verificationKey: 'RACHA_7_DIAS_ACCESO' },
     { title: 'Completar 3 misiones en una semana', description: 'Cuenta los registros de StudentMission con status = COMPLETADA dentro de una ventana de 7 días.', type: 'MEJORA_CONTINUA' as const, pointsReward: 250, autoVerify: true, verificationKey: 'COMPLETAR_3_MISIONES_SEMANA' },
     { title: 'Revisar las notificaciones pendientes', description: 'Verifica que el número de notificaciones con isRead = false sea igual a 0.', type: 'HABITO_ESTUDIO' as const, pointsReward: 150, autoVerify: true, verificationKey: 'SIN_NOTIFICACIONES_PENDIENTES' },
     // Misiones académicas con verificación automática real
     { title: 'Aprobar 6 créditos este semestre', description: 'Aprueba al menos 6 créditos durante el período académico actual.', type: 'ACADEMICO' as const, pointsReward: 200, autoVerify: true, verificationKey: 'APROBAR_CREDITOS_SEMESTRE', verificationValue: '6' },
     { title: 'Mejorar tu promedio en 0.5 puntos', description: 'Sube tu promedio ponderado al menos 0.5 puntos respecto al inicio del período.', type: 'ACADEMICO' as const, pointsReward: 250, autoVerify: true, verificationKey: 'MEJORAR_PROMEDIO', verificationValue: '0.5' },
     { title: 'Cero reprobados en el semestre', description: 'No registrar ninguna materia reprobada en el semestre actual.', type: 'ACADEMICO' as const, pointsReward: 200, autoVerify: true, verificationKey: 'CERO_REPROBADOS' },
     { title: 'Completar prerrequisitos de Programación Orientada a Objetos', description: 'Aprueba todos los prerrequisitos del curso C04A para poder cursarlo.', type: 'PLANIFICACION' as const, pointsReward: 150, autoVerify: true, verificationKey: 'COMPLETAR_PREREQUISITOS', verificationValue: 'C04A' },
     { title: 'Avanzar al siguiente semestre', description: 'Acumula los créditos necesarios (12 por semestre cursado) para avanzar de semestre.', type: 'ACADEMICO' as const, pointsReward: 180, autoVerify: true, verificationKey: 'AVANZAR_SEMESTRE' }
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
          // Llave canónica Meritcoin: debe coincidir con wallet_registry.student_id (STU-{moodleId}).
          // Ajusta con `npm run db:backfill-meritcoin -- --map ./meritcoin-map.json` para datos reales.
          meritcoinStudentId: 'STU-2',
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

  // Agregar una historia académica completa y un semestre vigente realista.
  const demoCourses = await prisma.course.findMany({
    where: { programId: program.id },
    include: { semester: true },
    orderBy: [{ semester: { number: 'asc' } }, { code: 'asc' }],
  })

  const demoProfile = await prisma.studentProfile.findUnique({
    where: { userId: demoUser.id },
  })

  if (demoProfile) {
    for (const course of demoCourses) {
      const semesterNumber = course.semester.number
      if (semesterNumber > 6) continue
      const isCurrent = semesterNumber === 6
      await prisma.enrollment.create({
        data: {
          studentId: demoProfile.id,
          courseId: course.id,
          semesterCode: isCurrent ? currentPeriod : `${2019 + semesterNumber - 1}-${semesterNumber % 2 === 0 ? 2 : 1}`,
          status: isCurrent ? 'CURSANDO' : 'APROBADO',
          grade: isCurrent ? null : [4.2, 4.5, 3.9, 4.1, 4.4, 4.0][(semesterNumber - 1) % 6],
        },
      })
    }

    console.log('✅ Inscripciones del usuario demo creadas')
  }

  // nuevo usuario con perfil de estudiante
  const secondPasswordHash = await bcrypt.hash('demo1234', 10)
  const secondStudent = await prisma.user.create({
    data: {
      email: 'demo2@utb.edu.co',
      name: 'Sara Peña',
      passwordHash: secondPasswordHash,
      role: 'STUDENT',
      studentProfile: {
        create: {
          studentCode: '2020123456',
          meritcoinStudentId: 'STU-3',
          programId: program.id,
          currentSemester: 8,
          admissionYear: 2019,
          totalCredits: 113,
          averageGrade: 4.0,
          level: 5
        }
      }
    }
  })

  console.log('✅ Segundo estudiante creado:', secondStudent.email)

  const saraProfile = await prisma.studentProfile.findUnique({
    where: { userId: secondStudent.id },
  })
  const saraCourses = await prisma.course.findMany({
    where: { programId: program.id },
    include: { semester: true },
    orderBy: { semester: { number: 'asc' } },
  })

  if (saraProfile) {
    for (const course of saraCourses) {
      const semesterNumber = course.semester.number
      if (semesterNumber > 8) continue

      await prisma.enrollment.create({
        data: {
          studentId: saraProfile.id,
          courseId: course.id,
          semesterCode: semesterNumber < 8 ? `${2018 + semesterNumber}-1` : currentPeriod,
          status: semesterNumber < 8 ? 'APROBADO' : 'CURSANDO',
          grade: semesterNumber < 8 ? 4.0 : null,
        },
      })
    }

    console.log('✅ Sara Peña configurada: semestres 1-7 aprobados y semestre 8 en curso')
  }

  // Estudiante de tercer semestre con promedio académico conservado.
  const juanitoStudent = await prisma.user.create({
    data: {
      email: 'juanito@utb.edu.co',
      name: 'Angela Lemus',
      passwordHash: secondPasswordHash,
      role: 'STUDENT',
      studentProfile: {
        create: {
          studentCode: '2021123456',
          meritcoinStudentId: 'STU-4',
          programId: program.id,
          currentSemester: 3,
          admissionYear: 2021,
          totalCredits: 60,
          averageGrade: 4.7,
          level: 4
        }
      }
    }
  })

  console.log('✅ Estudiante Angela Lemus creada:', juanitoStudent.email)

  // Docentes
  const teacherUser = await prisma.user.create({
    data: {
      email: 'docente@utb.edu.co',
      name: 'María González',
      passwordHash,
      role: 'TEACHER',
      teacherProfile: {
        create: {
          department: 'Ingeniería de Sistemas',
          faculty: 'Facultad de Ingeniería',
          profession: 'Ingeniera de Sistemas',
          title: 'Docente acompañante',
          isActive: true
        }
      }
    }
  })

  console.log('✅ Usuario docente creado:', teacherUser.email)

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: teacherUser.id }
  })
  const assignedCourses = await prisma.course.findMany({
    where: { code: { in: ['H01A', 'M01A', 'C02A', 'C04A'] } },
    orderBy: { code: 'asc' }
  })

  if (teacherProfile) {
    for (const course of assignedCourses) {
      await prisma.teacherCourse.create({
        data: {
          teacherId: teacherProfile.id,
          courseId: course.id,
          period: currentPeriod
        }
      })
    }

    // Matrícula vigente y distribuida por curso (solo CURSANDO en periodo actual)
    // Cada estudiante queda ligado solo a una materia, para que el filtro por materia sea visible
    const saraProfileForTeacher = await prisma.studentProfile.findUnique({ where: { userId: secondStudent.id } })
    const juanitoProfileForTeacher = await prisma.studentProfile.findUnique({ where: { userId: juanitoStudent.id } })
    const courseByCode = new Map(assignedCourses.map((c) => [c.code, c]))
    const enrollmentsByCourse: Array<{ code: string; student: typeof demoProfile | null }> = [
      { code: 'H01A', student: demoProfile }, // H01A -> Juan Pérez
      { code: 'M01A', student: saraProfileForTeacher }, // M01A -> Sara Peña
      { code: 'C04A', student: juanitoProfileForTeacher }, // C04A -> Angela Lemus, tercer semestre
      // Juan Pérez también en C02A para probar que un estudiante puede estar en más de una materia pero no en todas
      { code: 'C02A', student: demoProfile },
    ]
    for (const { code, student } of enrollmentsByCourse) {
      if (!student) continue
      const course = courseByCode.get(code)
      if (!course) continue
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: { studentId: student.id, courseId: course.id, semesterCode: currentPeriod },
      })
      if (existingEnrollment) continue

      await prisma.enrollment.create({
        data: {
          studentId: student.id,
          courseId: course.id,
          semesterCode: currentPeriod,
          status: 'CURSANDO'
        }
      })
    }
  }

  // Historia completa de Angela: semestres 1 y 2 aprobados, semestre 3 en curso.
  const angelaProfile = await prisma.studentProfile.findUnique({ where: { userId: juanitoStudent.id } })
  const angelaCourses = await prisma.course.findMany({
    where: { programId: program.id, semester: { number: { in: [1, 2, 3] } } },
    include: { semester: true },
    orderBy: [{ semester: { number: 'asc' } }, { code: 'asc' }]
  })
  if (angelaProfile) {
    for (const course of angelaCourses) {
      const isApproved = course.semester.number < 3
      const semesterCode = isApproved
        ? `${2024 + course.semester.number}-1`
        : currentPeriod
      await prisma.enrollment.upsert({
        where: { studentId_courseId_semesterCode: { studentId: angelaProfile.id, courseId: course.id, semesterCode } },
        update: { status: isApproved ? 'APROBADO' : 'CURSANDO', grade: isApproved ? 4.7 : null, source: 'UNIVERSITY' },
        create: { studentId: angelaProfile.id, courseId: course.id, semesterCode, status: isApproved ? 'APROBADO' : 'CURSANDO', grade: isApproved ? 4.7 : null, source: 'UNIVERSITY' }
      })
    }
  }

  // Créditos aprobados en el período actual para Juan Pérez, de modo que la misión
  // "Aprobar 6 créditos este semestre" (verificación automática) pueda completarse
  if (demoProfile) {
    const currentApprovedCourses = await prisma.course.findMany({
      where: { code: { in: ['C05A', 'C06A'] } }
    })
    for (const course of currentApprovedCourses) {
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: { studentId: demoProfile.id, courseId: course.id, semesterCode: currentPeriod },
      })
      if (existingEnrollment) continue

      await prisma.enrollment.create({
        data: {
          studentId: demoProfile.id,
          courseId: course.id,
          semesterCode: currentPeriod,
          status: 'APROBADO',
          grade: Number((3.0 + Math.random() * 1.8).toFixed(1)),
        },
      })
    }
  }

  console.log('✅ Cursos y estudiantes demo asignados al docente')

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
