# UTB Gamificación

Plataforma gamificada para el seguimiento del avance académico de estudiantes de la Universidad Tecnológica de Bolívar.

---

## Descripción

Sistema web donde el estudiante visualiza su progreso en la malla curricular, gana puntos e insignias, canjea recompensas académicas por puntos y recibe recomendaciones personalizadas. El docente acompaña a sus estudiantes por curso, verifica misiones con evidencia, aprueba canjes de recompensas y envía rutas recomendadas. Las insignias locales pueden emitirse on-chain a Meritcoin (ERC-1155) vinculando `STU-{id}` + wallet.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.3.2 (App Router, `src/app`) |
| UI | React 19, Tailwind CSS 4 (`src/app/globals.css`, `postcss.config.mjs`) |
| Base de datos | PostgreSQL |
| ORM | Prisma 7.9.1 (`prisma/schema.prisma`, `prisma.config.ts`, `src/lib/prisma.ts` con `@prisma/adapter-pg`) |
| Autenticación | NextAuth.js 5 beta (JWT + Credentials, `src/lib/auth.ts`) |
| Iconos | lucide-react |
| Temas | next-themes (claro/oscuro, `src/components/providers/ThemeProvider.tsx`) |
| Sesión cliente | `src/components/providers/SessionProvider.tsx` |

---

## Arquitectura Backend y APIs

Next.js funciona como frontend + backend. Las rutas `src/app/api/**/route.ts` son la API privada: validan sesión/rol con `src/lib/session.ts` (`requireRole`, `getSessionContext`), aplican reglas en `src/lib/*` y persisten con Prisma.

```text
Navegador (Client Components en src/app/*/page.tsx)
  |
  v
Next.js App Router (src/app/layout.tsx -> AppShell -> Sidebar/Header)
  |-- middleware.ts: redirige a /login si no hay cookie authjs.session-token
  |-- NextAuth: login con dominio @utb.edu.co + bcrypt (src/lib/auth.ts)
  `-- /api/*: endpoints por rol STUDENT / TEACHER
       |
       v
  src/lib/* (academic, recommendations, streak, activity, missionVerification, meritcoin)
       |
       v
  Prisma Client (src/lib/prisma.ts) -> PostgreSQL (22 modelos)
       |
       +--> Meritcoin FastAPI externo (solo insignias, via src/lib/meritcoin.ts)
```

### Capas del backend

| Capa | Ubicación | Responsabilidad |
|---|---|---|
| Guard global | `src/middleware.ts` | Deja pasar `/login`, `/api/auth`, estáticos; si no hay cookie de sesión redirige a `/login?callbackUrl=...`. Cada API además valida JSON. |
| Sesión/roles | `src/lib/auth.ts`, `src/lib/session.ts` | `auth()`, `requireRole("STUDENT"\|"TEACHER")`, `jsonUnauthorized`, `jsonForbidden`. Login solo `@utb.edu.co`. |
| Rutas HTTP | `src/app/api/**/route.ts` | Validan entrada, rol y responden JSON. Ver `src/app/api/README.md`. |
| Dominio | `src/lib/` | `academic.ts` (promedio, semestre actual, tope créditos), `recommendations.ts`, `streak.ts`, `activity.ts` (`ACTIVITY_ACTIONS`, racha diaria), `missionRules.ts` + `missionVerification.ts` (auto-verificación), `meritcoin.ts` (espejo + emisión on-chain). |
| Persistencia | `src/lib/prisma.ts` | Singleton `PrismaClient` + `PrismaPg`. En dev se reutiliza vía `globalThis`. |
| Modelo | `prisma/schema.prisma` | 22 modelos: usuarios, malla, progreso, gamificación, recompensas, notificaciones, riesgo, Meritcoin. |
| Datos | `prisma/seed.ts`, `prisma/seed.demo.ts`, `prisma/backfill-meritcoin-ids.ts` | Seed base (programa ISCO 2019, 10 semestres, 55 cursos, 162 créditos, niveles, misiones, badges, rewards + demo@utb.edu.co), seed demo end-to-end aislado, backfill de `STU-{id}`. |

### Catálogo de APIs

| Endpoint | Métodos | Rol | Función |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | público | Login/logout NextAuth Credentials. |
| `/api/student` | GET, PATCH | STUDENT | GET perfil + stats + racha + insignias recientes (registra `ACADEMIC_DAILY_ACTIVITY`). PATCH `{ walletAddress, meritcoinStudentId }` para vínculo Meritcoin. |
| `/api/curriculum` | GET, POST | STUDENT | GET malla por semestre con estado (aprobado/en curso/bloqueado/disponible), prerrequisitos y créditos. POST selección de cursos del periodo. |
| `/api/stats` | GET | STUDENT | Créditos aprobados/totales, promedio (`academic.ts`), avance por semestre, puntos/nivel, tendencia. |
| `/api/missions` | GET, POST | STUDENT | GET disponibles (por `level`) + estado del estudiante. POST crear/avanzar con `evidence`; si `autoVerify` usa `missionVerification.ts`, si no queda `EN_REVISION`. |
| `/api/rewards` | GET, POST | STUDENT | GET catálogo activo + puntos totales + canjes + cursos del periodo actual para elegir `courseId`. POST solicitar canje `{ rewardId, courseId }` (descuenta puntos, estado `SOLICITADO`). |
| `/api/badges` | GET | STUDENT | Locales + espejo Meritcoin (`syncMeritcoinTemplates`, `syncMeritcoinBadges`, saldo MRT). |
| `/api/badges/award` | POST | STUDENT | `{ badgeId }` emite insignia local ya ganada a Meritcoin on-chain. Exige `meritcoinStudentId` formato `STU-x` y wallet custodial (la provisiona si falta). |
| `/api/notifications` | GET, PATCH, DELETE | ambos | Listar, marcar leída (`isRead`), borrar. Tipos: `INFO, WARNING, ALERTA_RIESGO, LOGRO_OBTENIDO, MISION_DISPONIBLE, RECORDATORIO, SOLICITUD_RECOMPENSA`. |
| `/api/recommendations` | GET, PATCH | STUDENT | GET genera bajo demanda con `generateRecommendations()`. PATCH aceptar/descartar (`isAccepted`, `isRead`). |
| `/api/search` | GET `?q=` | ambos | Búsqueda global (cursos, misiones, insignias) insensible a tildes. |
| `/api/teacher` | GET, PATCH | TEACHER | GET cursos asignados (`TeacherCourse` por `periodo YYYY-1/2`) + estudiantes con promedio/créditos/racha/riesgo. PATCH revisar misión (aprobar/devolver con `reviewComment`, otorga puntos). |
| `/api/teacher/rewards` | GET, PATCH | TEACHER | GET solicitudes de canje de sus cursos + historial. PATCH aprobar/rechazar (`APROBADO/RECHAZADO`, `reviewNote`). |
| `/api/teacher/notify` | POST | TEACHER | `{ studentId, message/cursos }` envía notificación de ruta recomendada y guarda `Activity{RUTA_RECOMENDADA_DOCENTE}`. |

Errores estándar: `401 { error: "No autorizado" }` sin sesión, `403` rol incorrecto, `404` perfil/recurso no encontrado.

Detalle de flujos y cómo añadir endpoints: ver `src/app/api/README.md`.

---

## Funcionalidades

### Estudiantes (`/dashboard`, `/malla`, `/misiones`, `/logros`, `/recompensas`, `/estadisticas`, `/notificaciones`, `/perfil`)

- **Dashboard**: puntos, nivel, racha, misiones activas, logros recientes, notificaciones y alertas.
- **Malla interactiva**: por semestre con estado por prerrequisitos, créditos aprobados vs totales y selección de materias del periodo.
- **Misiones**: tipos `ACADEMICO, PLANIFICACION, MEJORA_CONTINUA, HABITO_ESTUDIO, IMPACTO_SOCIAL`. Manuales con evidencia + revisión docente, o automáticas (`verificationKey/Value`: créditos, promedio, racha) vía `missionVerification.ts`. Estados: `PENDIENTE → EN_PROGRESO → EN_REVISION → COMPLETADA/VERIFICADA/RECHAZADA`.
- **Logros**: locales por progreso/rendimiento/hábito + espejo Meritcoin (`MERIT-<tokenId>`). Barra de progreso y saldo MRT.
- **Recompensas**: canje de puntos por bonificaciones (`EXAMEN, ASISTENCIA, ENTREGA, OTRO`) atadas a un `courseId` del periodo actual. Flujo `SOLICITADO → APROBADO/RECHAZADO → USADO/EXPIRADO`. Página `/recompensas`.
- **Recomendaciones**: cuello de botella, reprobadas, electivas, ruta del próximo semestre, promedio < 3.5, rellenar créditos.
- **Estadísticas**: créditos, promedio, nivel, tendencia y distribución por semestre.
- **Perfil**: datos académicos, vínculo Meritcoin (`wallet 0x...` + `STU-x`, estados `Sin vincular / ID vinculado sin wallet / Vinculado`), nivel e insignias recientes.
- **Responsive + modo claro/oscuro** (`next-themes`, `AppShell` + `Sidebar`/`Header`).

### Docentes (`/docentes`, `/perfil-docente`)

- **Acompañamiento**: cursos asignados del periodo + estudiantes inscritos (promedio, créditos, racha, insignias, riesgo).
- **Verificación de misiones**: aprobar/devolver con comentario (otorga `Point{MISION_COMPLETADA}`).
- **Recompensas**: aprobar/rechazar canjes de sus cursos.
- **Enviar ruta recomendada**: notificación al estudiante + registro en `Activity`.
- **Perfil docente**: facultad, departamento, profesión, cargo, conteo de estudiantes y misiones pendientes.

---

## Sistema de Gamificación

### Puntos (`Point.source`)

`MISION_COMPLETADA, RENDIMIENTO_ACADEMICO, MEJORA_PROMEDIO, CONSISTENCIA, IMPACTO_SOCIAL, EVENTO_ESPECIAL`.

### Niveles (`Level`, seed en `prisma/seed.ts`)

| # | Nombre | Puntos mínimos |
|---|---|---|
| 1 | Novato | 0 |
| 2 | Aprendiz | 500 |
| 3 | Explorador | 1500 |
| 4 | Avanzado | 3000 |
| 5 | Maestro | 5000 |
| 6 | Leyenda | 8000 |

### Insignias (`Badge.category`)

`PROGRESO, RENDIMIENTO, HABITO, COMPETENCIA, IMPACTO_SOCIAL, MERITCOIN`. Las on-chain se espejan por `externalId = MERIT-<tokenId>`.

### Misiones (`Mission.type`)

`ACADEMICO, PLANIFICACION, MEJORA_CONTINUA, HABITO_ESTUDIO, IMPACTO_SOCIAL`.

### Recompensas (`Reward.category`)

`EXAMEN (exonerar/mejorar nota), ASISTENCIA (limpiar falta), ENTREGA (extender/reintentar), OTRO`. Campos: `cost` en puntos, `maxUses`, `isActive`.

### Recomendaciones

Motor `src/lib/recommendations.ts`: prerrequisitos que más desbloquean (alta), reprobadas (alta), promedio bajo (alta), ruta siguiente semestre (media), electivas desbloqueadas (baja), rellenar créditos.

### Riesgo (`RiskAlert`)

`PREREQUISITO_FALTANTE, ATRASO_CREDITOS, BAJO_PROMEDIO, CURSO_EN_RIESGO, SEMESTRE_RETRASADO` con severidad `BAJA/MEDIA/ALTA/CRITICA`.

---

## Estructura del Proyecto

```text
utb-gamificacion/
  .env / .env.example        # DATABASE_URL, NEXTAUTH_SECRET/URL + MERITCOIN_* (ver Instalación)
  setup.sh                   # Instalación automática (Node via nvm, Postgres, .env, db:push, seed)
  next.config.ts / tsconfig.json / eslint.config.mjs / postcss.config.mjs / prisma.config.ts
  public/utb-logotipo.png
  scripts/                   # (vacía, utilidades futuras)
  prisma/
    schema.prisma            # 22 modelos
    migrations/              # Migraciones SQL
    seed.ts                  # Seed base: ISCO 2019 + usuarios demo
    seed.demo.ts             # Seed demo end-to-end aislado (npm run db:seed:demo)
    backfill-meritcoin-ids.ts# Rellena STU-{id} faltantes (npm run db:backfill-meritcoin)
  src/
    middleware.ts            # Guard de páginas -> /login
    app/
      layout.tsx / globals.css / page.tsx (-> /dashboard) / favicon.ico
      login/ dashboard/ malla/ misiones/ logros/ recompensas/
      estadisticas/ notificaciones/ perfil/ docentes/ perfil-docente/
      api/                   # Backend (ver src/app/api/README.md)
    components/
      layout/AppShell.tsx    # Oculta Sidebar/Header en /login
      layout/Sidebar.tsx / layout/Header.tsx  # Nav por rol + búsqueda global
      providers/SessionProvider.tsx / providers/ThemeProvider.tsx
    lib/
      auth.ts / session.ts / prisma.ts
      academic.ts (+ academic.test.ts)
      recommendations.ts / streak.ts / activity.ts
      missionRules.ts (+ missionRules.test.ts) / missionVerification.ts
      meritcoin.ts           # Cliente FastAPI Meritcoin + emisión ERC-1155
```

Estructura detallada del frontend: `src/app/README.md`. Estructura del backend: `src/app/api/README.md`.

---

## Instalación

### Prerrequisitos

- Node.js 18+
- PostgreSQL
- npm

### Método rápido (recomendado)

```bash
./setup.sh            # Completa: Node, Postgres, .env, dependencias, db:push, seed
./setup.sh --skip-db  # Solo npm install, sin tocar Postgres
```

Detecta Debian/Fedora/Arch/macOS, instala Node >=18 vía nvm, crea usuario/DB, genera `.env` desde `.env.example`, hace `db:generate + db:push + db:seed`.

### Método manual

1. Clonar e instalar:

```bash
git clone <url-del-repositorio>
cd utb-gamificacion
npm install
```

2. Variables de entorno (`.env`, plantilla en `.env.example`):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/utb_gamificacion?schema=public"
NEXTAUTH_SECRET="cambia-este-secreto-por-uno-seguro"
NEXTAUTH_URL="http://localhost:3000"
MERITCOIN_API_URL="http://localhost:8000"
MERITCOIN_IPFS_GATEWAY="https://ipfs.io/ipfs/"
MERITCOIN_ISSUER_ID="utb-app"
MERITCOIN_ISSUER_ROLE="admin"
MERITCOIN_ONBOARDING_COURSE_ID="GAMIFICACION-ONBOARDING"
```

Sin `MERITCOIN_*` la app funciona local; solo falla el espejo/emisión on-chain.

3. DB + seed:

```bash
npm run db:generate
npm run db:push
npm run db:seed        # base
# o:
npm run db:seed:demo   # caso demo end-to-end (resetea, solo pruebas)
npm run db:backfill-meritcoin  # rellena meritcoinStudentId STU-{id} faltantes
```

4. Dev:

```bash
npm run dev
# http://localhost:3000  -> redirige a /dashboard (o /login sin sesión)
```

---

## Credenciales de Prueba (seed base)

| Campo | Valor |
|-------|-------|
| Email estudiante | demo@utb.edu.co |
| Contraseña | demo123 |

El email debe terminar en `@utb.edu.co`. El seed demo (`db:seed:demo`) crea más usuarios/roles y escenarios (misiones y canjes en cada estado); ver cabecera de `prisma/seed.demo.ts`.

---

## Comandos Disponibles

```bash
./setup.sh              # Instalación completa
./setup.sh --skip-db    # Solo dependencias npm

npm run dev              # Dev con hot reload
npm run build            # Build producción
npm run start            # Servidor producción

npm run db:generate      # Generar cliente Prisma
npm run db:push          # Sincronizar schema (sin migraciones)
npm run db:seed          # Seed base (tsx prisma/seed.ts)
npm run db:seed:demo     # Seed demo end-to-end
npm run db:backfill-meritcoin # Backfill STU-{id}
npm run db:reset         # push --force-reset + seed base
npm run db:studio        # Prisma Studio GUI

npm run lint             # ESLint (next + TS)
npm run test:unit        # Tests unitarios (tsx --test src/lib/**/*.test.ts)
```

---

## Modelos de Base de Datos (22)

### Usuarios y auth

- **User**: email institucional único, nombre, `passwordHash` (bcrypt), rol `STUDENT/TEACHER/ADMIN`.
- **StudentProfile**: `studentCode`, `programId`, `currentSemester`, `totalCredits`, `averageGrade`, `level`, `walletAddress` (0x, espejo `wallet_registry`), `meritcoinStudentId` único `STU-{id}`.
- **TeacherProfile**: departamento, facultad, profesión, cargo, `isActive`.

### Académico

- **Program**: ej. ISCO `Ingeniería de Sistemas`, 162 créditos, 10 semestres, versión `2019`.
- **Semester / Course / Prerequisite**: cursos por semestre, tipo `OBLIGATORIO/ELECTIVA/LIBRE_ELECCION/GENERAL`, prerrequisito `REQUIRED/COREQUISITE`.
- **Enrollment**: `{ studentId, courseId, semesterCode YYYY-1/2 }` único, estado `INSCRITO/CURSANDO/APROBADO/REPROBADO/RETIRADO/CANCELADO`, `grade`, origen `UNIVERSITY/MANUAL`.
- **AcademicRecord**: historial importado (`courseCode, grade, semester, year, credits`, estado `APROBADO/REPROBADO/EN_CURSO/PENDIENTE`).
- **TeacherCourse**: `{ teacherId, courseId, period }` único.

### Gamificación

- **Point**: `amount + source + description`.
- **Mission**: `type, pointsReward, autoVerify + verificationKey/Value, courseId?, requiredLevel?, isActive, start/endDate`.
- **StudentMission**: `status, progress 0-100, evidence, metadata JSON, verifiedBy/At, reviewComment`, único por estudiante+misión.
- **Badge**: `category, iconUrl, requiredLevel?, pointsRequired?, externalId? MERIT-<tokenId>`.
- **StudentBadge**: único por estudiante+insignia.
- **Level**: `number, name, minPoints`.

### Recompensas

- **Reward**: `name, icon, category EXAMEN/ASISTENCIA/ENTREGA/OTRO, cost, maxUses?, isActive`.
- **StudentReward**: `{ studentId, rewardId }` único, `courseId` objetivo, `status SOLICITADO/APROBADO/RECHAZADO/EXPIRADO/USADO`, `pointsSpent, requestedAt, reviewedBy/At, reviewNote, evidence, expiresAt`.

### Notificaciones, actividad, recomendaciones, riesgo

- **Notification**: `title, message, type, isRead, link?`.
- **Activity**: `{ action, details Json? }`, acciones en `ACTIVITY_ACTIONS` (`LOGIN, PAGE_VIEW, ACADEMIC_DAILY_ACTIVITY, RUTA_RECOMENDADA_DOCENTE...`) para rachas.
- **Recommendation**: `type CURSO_SUGERIDO/RUTA_ACademica/ALERTA_ATRASO/MEJORA_PROMEDIO/ELECTIVA_RECOMENDADA/RELLENAR_CREDITOS, priority 1=alta 2=media 3=baja, isRead, isAccepted?`.
- **RiskAlert**: `type + severity BAJA/MEDIA/ALTA/CRITICA, courseId?, isResolved?`.

---

## Seguridad

- Solo `@utb.edu.co` (`src/lib/auth.ts` authorize), bcrypt, JWT.
- `src/middleware.ts` protege páginas; cada API revalida con `requireRole` (no confiar solo en el middleware, cuyo `matcher` excluye `/api`).
- Validación de entrada y 401/403/404 JSON en todos los endpoints.

---

## Integración Meritcoin (`src/lib/meritcoin.ts`)

- Backend FastAPI externo (`MERITCOIN_API_URL`): `GET /students/{wallet}/summary`, `/students/{wallet}/badges`, emisión ERC-1155, `wallet_registry.student_id = STU-{id}`.
- `STU-{id}` se normaliza con `normalizeMeritcoinStudentId()` y se backfillea con `db:backfill-meritcoin`.
- Si hay `STU-x` sin wallet, `/logros`/`/api/badges/award` provisionan wallet custodial automáticamente.
- Sin Meritcoin arriba, todo lo local sigue funcionando.

## Integraciones Futuras

- **PROA**: mallas académicas.
- **Banner**: registro académico oficial.

---

## Licencia

Proyecto académico - Universidad Tecnológica de Bolívar.
