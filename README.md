# UTB Gamificacion

Plataforma gamificada para el seguimiento del avance academicos de estudiantes de la Universidad Tecnologica de Bolivar.

---

## Descripcion

Sistema web que permite a los estudiantes visualizar su progreso en la malla curricular, ganar puntos y insignias por sus logros, y recibir recomendaciones personalizadas para mejorar su rendimiento academico. Los docentes pueden acompanar a sus estudiantes, verificar misiones y orientar sus rutas de aprendizaje.

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Framework | Next.js 16.3.2 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| Base de datos | PostgreSQL 7.9.1 |
| ORM | Prisma 7.9.1 |
| Autenticacion | NextAuth.js 5 (beta, JWT + Credentials) |
| Iconos | Lucide React |
| Temas | next-themes (modo claro/oscuro) |

---

## Funcionalidades

### Estudiantes

- **Dashboard**: resumen de progreso, nivel, puntos, racha, misiones activas, logros recientes y notificaciones.
- **Malla curricular interactiva**: visualizacion por semestre con estado de cada curso (aprobado, en curso, bloqueado, disponible), creditos aprobados vs totales y seleccion de materias.
- **Misiones y desafios**: retos de tipo academico, planificacion, mejora continua, habitos de estudio e impacto social. El estudiante sube evidencia y el docente verifica.
- **Logros e insignias**: insignias automaticas por progreso (Explorador), rendimiento (Excelencia, Especialista) y constancia (Velocista), con barra de progreso.
- **Recomendaciones inteligentes**: motor que analiza prerrequisitos, cursos cuello de botella, materias reprobadas, electivas disponibles y promedio bajo para sugerir acciones prioritarias.
- **Estadisticas**: creditos, promedio, nivel, tendencia de notas y distribucion por semestre.
- **Notificaciones**: alertas de riesgo, logros obtenidos, misiones disponibles y recordatorios.
- **Perfil**: informacion academica, nivel de gamificacion y resumen de insignias.
- **Modo oscuro y claro**: con transicion suave y preferencia persistida.
- **Diseno responsive**: optimizado para escritorio y movil.

### Docentes

- **Acompanamiento docente**: vista de cursos asignados con lista de estudiantes inscritos.
- **Verificacion de misiones**: revisar evidencia, aprobar o devolver con comentarios.
- **Perfil del estudiante**: promedio, creditos, cursos aprobados, racha, materias del semestre actual, ruta recomendada, insignias y alertas de riesgo.
- **Perfil docente**: informacion profesional, facultad, departamento y estadisticas de acompanamiento.

---

## Sistema de Gamificacion

### Puntos

Los estudiantes acumulan puntos por distintas fuentes:

| Fuente | Descripcion |
|--------|-------------|
| MISION_COMPLETADA | Completar una mision verificada |
| RENDIMIENTO_ACADEMICO | Notas destacadas |
| MEJORA_PROMEDIO | Incremento en el promedio |
| CONSISTENCIA | Racha de actividad diaria |
| IMPACTO_SOCIAL | Participacion en actividades sociales |
| EVENTO_ESPECIAL | Logros puntuales |

### Niveles

| Nivel | Nombre | Puntos minimos |
|-------|--------|---------------|
| 1 | Novato | 0 |
| 2 | Aprendiz | 500 |
| 3 | Explorador | 1.500 |
| 4 | Avanzado | 3.000 |
| 5 | Maestro | 5.000 |
| 6 | Leyenda | 8.000 |

### Insignias

| Categoria | Descripcion |
|-----------|-------------|
| PROGRESO | Avance en la carrera (completar semestre, materias) |
| RENDIMIENTO | Notas destacadas y promedio alto |
| HABITO | Constancia y actividad regular |
| COMPETENCIA | Dominio de habilidades especificas |
| IMPACTO_SOCIAL | Participacion y colaboracion |

### Misiones

| Tipo | Descripcion |
|------|-------------|
| ACADEMICO | Tareas relacionadas con el rendimiento academico |
| PLANIFICACION | Actividades de organizacion y planificacion |
| MEJORA_CONTINUA | Retos de crecimiento personal |
| HABITO_ESTUDIO | Practicas de estudio y constancia |
| IMPACTO_SOCIAL | Participacion en la comunidad universitaria |

### Recomendaciones

El motor de recomendaciones analiza:

1. **Cursos cuello de botella**: materias que desbloquean mas cursos siguientes (prioridad alta).
2. **Materias reprobadas**: cursos que es necesario repetir (prioridad alta).
3. **Electivas disponibles**: optativas desbloqueadas para sumar creditos (prioridad baja).
4. **Ruta sugerida**: obligatorias del proximo semestre ya desbloqueadas (prioridad media).
5. **Promedio bajo**: alerta cuando el promedio cae por debajo de 3.5 (prioridad alta).

### Alertas de Riesgo

| Tipo | Descripcion |
|------|-------------|
| PREREQUISITO_FALTANTE | Falta un prerrequisito para inscribir un curso |
| ATRASO_CREDITOS | El estudiante va retrasado en creditos aprobados |
| BAJO_PROMEDIO | Promedio por debajo del umbral de riesgo |
| CURSO_EN_RIESGO | Riesgo de reprobar un curso en curso |
| SEMESTRE_RETRASADO | El estudiante lleva mas semestres de los planificados |

---

## Estructura del Proyecto

```
utb-gamificacion/
  prisma/
    schema.prisma          # Modelos de la base de datos (23 modelos)
    seed.ts                # Datos iniciales de prueba
  src/
    app/
      api/
        auth/[...nextauth]/ # Autenticacion NextAuth
        badges/             # CRUD de insignias
        curriculum/         # Malla curricular
        missions/           # Misiones estudiantiles
        notifications/      # Notificaciones
        recommendations/    # Motor de recomendaciones
        search/             # Busqueda global
        stats/              # Estadisticas del estudiante
        student/            # Datos del estudiante
        teacher/            # Datos del docente
      dashboard/            # Dashboard principal
      docentes/             # Acompanamiento docente
      estadisticas/         # Estadisticas detalladas
      logros/               # Insignias y logros
      malla/                # Malla curricular interactiva
      misiones/             # Sistema de misiones
      notificaciones/       # Centro de notificaciones
      perfil/               # Perfil del estudiante
      perfil-docente/       # Perfil del docente
      login/                # Inicio de sesion
    components/
      layout/               # AppShell, Sidebar, Header
      providers/            # ThemeProvider, SessionProvider
    lib/
      auth.ts               # Configuracion NextAuth + bcrypt
      prisma.ts             # Cliente de Prisma
      badges.ts             # Logica de insignias dinamicas
      streak.ts             # Calculo de racha de actividad
      recommendations.ts    # Generador de recomendaciones
      academic.ts           # Utilidades academicas (promedio, semestre)
  package.json
  tsconfig.json
  postcss.config.mjs
```

---

## Instalacion

### Prerrequisitos

- Node.js 18+
- PostgreSQL
- npm

### Pasos

1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd utb-gamificacion
```

2. Instalar dependencias

```bash
npm install
```

3. Configurar variables de entorno

Crear un archivo `.env` en la raiz del proyecto:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/utb_gamificacion?schema=public"
NEXTAUTH_SECRET="tu-secreto-aqui"
NEXTAUTH_URL="http://localhost:3000"
```

4. Generar cliente de Prisma y crear tablas

```bash
npm run db:generate
npm run db:push
```

5. Poblar la base de datos con datos de ejemplo

```bash
npm run db:seed
```

6. Iniciar el servidor de desarrollo

```bash
npm run dev
```

7. Abrir en el navegador

```
http://localhost:3000
```

---

## Credenciales de Prueba

| Campo | Valor |
|-------|-------|
| Email | demo@utb.edu.co |
| Contrasena | demo123 |

El email debe terminar en `@utb.edu.co` para poder iniciar sesion.

---

## Comandos Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo con hot reload

# Build
npm run build            # Construir para produccion
npm run start            # Iniciar servidor de produccion

# Base de datos
npm run db:generate      # Generar cliente Prisma
npm run db:push          # Sincronizar schema con la DB
npm run db:seed          # Poblar con datos de ejemplo
npm run db:reset         # Resetear y poblar la DB
npm run db:studio        # Abrir Prisma Studio (GUI)

# Codigo
npm run lint             # Verificar con ESLint
```

---

## Modelos de Base de Datos

### Usuarios y Autenticacion

- **User**: email (institucional), nombre, hash de contrasena, rol (STUDENT/TEACHER/ADMIN).
- **StudentProfile**: codigo universitario, programa, semestre actual, creditos, promedio, nivel.
- **TeacherProfile**: departamento, facultad, profesion, cargo.

### Academico

- **Program**: Ingenieria de Sistemas (u otros), creditos totales, semestres, version del plan.
- **Semester**: numero del semestre dentro del programa.
- **Course**: codigo, nombre, creditos, tipo (OBLIGATORIO/ELECTIVA/LIBRE_ELECCION/GENERAL).
- **Prerequisite**: relaciones de prerrequisito y correquisito entre cursos.
- **Enrollment**: inscripcion de un estudiante en un curso por periodo, con nota y estado.
- **AcademicRecord**: historial academico importado (notas, semestre, estado).
- **TeacherCourse**: asignacion de docentes a cursos por periodo.

### Gamificacion

- **Point**: puntos acumulados con fuente y descripcion.
- **Mission**: misiones con tipo, recompensa en puntos, nivel requerido y evidencia.
- **StudentMission**: progreso del estudiante en cada mision (0-100%, verificacion docente).
- **Badge**: insignias por categoria con nivel y puntos requeridos.
- **StudentBadge**: insignias obtenidas por el estudiante.
- **Level**: configuracion de niveles con puntos minimos.

### Notificaciones y Actividad

- **Notification**: notificaciones por tipo (INFO, WARNING, ALERTA_RIESGO, LOGRO_OBTENIDO, MISION_DISPONIBLE, RECORDATORIO).
- **Activity**: registro de actividad del estudiante para calcular rachas.

### Recomendaciones y Riesgo

- **Recommendation**: recomendaciones generadas automaticamente con prioridad.
- **RiskAlert**: alertas de riesgo academico con severidad (BAJA/MEDIA/ALTA/CRITICA).

---

## Seguridad

- Autenticacion por credenciales con validacion de dominio institucional (`@utb.edu.co`).
- Contrasenas hasheadas con bcrypt.
- Sesiones JWT.
- Proteccion de rutas API via middleware.
- Validacion de entrada en todos los endpoints.

---

## Integraciones Futuras

- **PROA**: fuente de mallas academicas.
- **Banner**: registro academico oficial.

---

## Licencia

Proyecto academico - Universidad Tecnologica de Bolivar.
