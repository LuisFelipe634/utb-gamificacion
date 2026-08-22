# 🎮 UTB Gamificación - Avance Académico

**Experiencia gamificada para conocer estado de avance académico durante la carrera y recomendaciones para mejorar**

Sistema desarrollado para la Universidad Tecnológica de Bolívar que permite a los estudiantes visualizar su progreso en la malla curricular a través de una experiencia gamificada con misiones, insignias y recomendaciones.

---

## 📋 Características Principales

### Para Estudiantes
- 📊 **Dashboard** con resumen de progreso académico
- 📚 **Malla Curricular interactiva** con estados de cursos (bloqueado/disponible/completado)
- 🎯 **Misiones y retos** académicos para ganar puntos
- 🏆 **Insignias y logros** por rendimiento y hábitos
- 📈 **Estadísticas** detalladas de progreso
- 🔔 **Notificaciones** y alertas de riesgo
- 🌙 **Modo oscuro** y diseño responsive

### Para Docentes
- 👀 Vista de seguimiento de estudiantes
- 📊 Análisis de rutas académicas recomendadas

### Para Coordinadores
- 📈 Indicadores del programa
- 👥 Visualización del avance de estudiantes

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Next.js 16 + React 19 |
| **Estilos** | Tailwind CSS 4 |
| **Backend** | Next.js API Routes |
| **Base de Datos** | PostgreSQL + Prisma ORM |
| **Autenticación** | NextAuth.js v5 |
| **Iconos** | Lucide React |

---

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+ 
- PostgreSQL (local o en la nube)
- npm o yarn

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd utb-gamificacion
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar base de datos**
   
   Crea un archivo `.env` en la raíz del proyecto:
   ```env
   DATABASE_URL="postgresql://usuario:password@localhost:5432/utb_gamificacion?schema=public"
   NEXTAUTH_SECRET="tu-secreto-aqui"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Generar cliente de Prisma**
   ```bash
   npm run db:generate
   ```

5. **Crear tablas en la base de datos**
   ```bash
   npm run db:push
   ```

6. **Poblar la base de datos con datos de ejemplo**
   ```bash
   npm run db:seed
   ```

7. **Iniciar el servidor de desarrollo**
   ```bash
   npm run dev
   ```

8. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

---

## 👤 Usuario Demo

Para probar el sistema, utiliza las siguientes credenciales:

| Campo | Valor |
|-------|-------|
| **Email** | demo@utb.edu.co |
| **Contraseña** | demo123 |

---

## 📁 Estructura del Proyecto

```
utb-gamificacion/
├── prisma/
│   ├── schema.prisma      # Schema de la base de datos
│   └── seed.ts            # Script de datos iniciales
├── src/
│   ├── app/
│   │   ├── api/           # API Routes
│   │   ├── dashboard/     # Dashboard principal
│   │   ├── login/         # Página de login
│   │   ├── malla/         # Malla curricular
│   │   ├── misiones/      # Sistema de misiones
│   │   ├── logros/        # Insignias y logros
│   │   ├── notificaciones/# Notificaciones
│   │   └── estadisticas/  # Estadísticas
│   ├── components/
│   │   ├── layout/        # Sidebar, Header
│   │   └── providers/     # ThemeProvider
│   ├── lib/
│   │   ├── prisma.ts      # Cliente de Prisma
│   │   └── auth.ts        # Configuración NextAuth
│   └── generated/         # Cliente Prisma generado
├── .env                   # Variables de entorno
└── package.json
```

---

## 🎮 Sistema de Gamificación

### Puntos
Los estudiantes ganan puntos por:
- Completar misiones (+100 a +300 pts)
- Mejorar su promedio académico
- Mantener asistencia constante
- Participar en actividades sociales

### Niveles
| Nivel | Nombre | Puntos Requeridos |
|-------|--------|-------------------|
| 1 | Novato | 0 |
| 2 | Aprendiz | 500 |
| 3 | Explorador | 1,500 |
| 4 | Avanzado | 3,000 |
| 5 | Maestro | 5,000 |
| 6 | Leyenda | 8,000 |

### Insignias
- 🎯 **Progreso**: Por avanzar en la carrera
- ⭐ **Rendimiento**: Por notas destacadas
- 📅 **Hábito**: Por constancia y asistencia
- 👨‍🏫 **Social**: Por ayudar a otros
- 🏆 **Competencia**: Por dominar habilidades

---

## 🔧 Comandos Disponibles

```bash
# Desarrollo
npm run dev          # Iniciar servidor de desarrollo

# Build
npm run build        # Construir para producción
npm run start        # Iniciar servidor de producción

# Base de datos
npm run db:generate  # Generar cliente Prisma
npm run db:push      # Sincronizar schema con DB
npm run db:seed      # Poblar con datos de ejemplo
npm run db:reset     # Resetear y poblar DB
npm run db:studio    # Abrir Prisma Studio (GUI)

# Código
npm run lint         # Verificar código
```

---

## 📝 Requisitos del Sistema

### Requisitos Funcionales
- ✅ RF-001: Inicio de sesión con correo institucional
- ✅ RF-002: Perfil académico del estudiante
- ✅ RF-003: Historial académico
- ✅ RF-004: Visualización de progreso
- ✅ RF-005: Retos o misiones
- ✅ RF-006: Logros o insignias
- ✅ RF-007: Sistema de puntos
- ✅ RF-008: Recordatorios y notificaciones
- ✅ RF-009: Panel de control (Dashboard)

### Requisitos No Funcionales
- ✅ RNF-001: Usabilidad e interfaz clara
- ✅ RNF-002: Rendimiento optimizado
- ✅ RNF-003: Seguridad de datos
- ✅ RNF-004: Compatibilidad responsive
- ✅ RNF-005: Escalabilidad
- ✅ RNF-006: Disponibilidad continua

---

## 🔐 Seguridad

- Contraseñas hasheadas con bcrypt
- Sesiones JWT seguras
- Protección de rutas API
- Validación de entrada

---

## 🌐 Integraciones Futuras

El sistema está diseñado para integrarse con:
- **PROA**: Fuente de mallas académicas
- **Banner**: Registro académico oficial

---

## 📄 Licencia

Proyecto académico - Universidad Tecnológica de Bolívar

---

## 👥 Equipo

Desarrollado como parte del proyecto de Ingeniería I

---

## 📞 Soporte

Para preguntas o problemas, contactar al equipo de desarrollo.
