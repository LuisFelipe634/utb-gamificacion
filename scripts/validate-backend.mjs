// Validador end-to-end del backend UTB Gamificación (corre contra Docker).
// Uso: node scripts/validate-backend.mjs
// Hace mutaciones reales (aprueba 1 misión, rechaza 1 canje, completa 1 misión,
// envía 1 notificación) y al final se debe re-sembrar con `npm run db:seed:demo`
// apuntando a la BD del contenedor para dejar el caso demo intacto.
const BASE = process.env.APP_URL || "http://localhost:3000";
const PASS = "demo123";

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass: !!pass, detail: String(detail).slice(0, 160) });
  console.log(`${pass ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

class Jar {
  constructor() { this.cookies = new Map(); }
  store(res) {
    const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    for (const c of setCookies) {
      const [pair] = c.split(";");
      const idx = pair.indexOf("=");
      if (idx > 0) this.cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
    }
  }
  header() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function req(jar, path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    redirect: "manual",
    headers: { ...(opts.headers || {}), ...(jar ? { Cookie: jar.header() } : {}) },
  });
  if (jar) jar.store(res);
  return res;
}
async function json(jar, path, opts = {}) {
  const res = await req(jar, path, opts);
  let body = null;
  try { body = await res.json(); } catch { /* no-json */ }
  return { status: res.status, body, headers: res.headers };
}

async function login(email, password) {
  const jar = new Jar();
  const csrf = await json(jar, "/api/auth/csrf");
  const token = csrf.body?.csrfToken;
  if (!token) return { jar, ok: false, detail: "sin csrfToken" };
  const res = await req(jar, "/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken: token, email, password, json: "true" }),
  });
  const loc = res.headers.get("location") || "";
  if (loc.includes("error=")) return { jar, ok: false, detail: loc };
  const session = await json(jar, "/api/auth/session");
  const ok = session.body?.user?.email === email.toLowerCase();
  return { jar, ok, detail: ok ? `rol=${session.body.user.role}` : JSON.stringify(session.body).slice(0, 120) };
}

const has = (arr, pred) => Array.isArray(arr) && arr.some(pred);

async function main() {
  // ---- A. Rutas públicas y guardias sin sesión ----
  let r = await req(null, "/login");
  check("A1 GET /login público", r.status === 200, `status=${r.status}`);

  let s = await json(null, "/api/student");
  check("A2 GET /api/student sin sesión → 401", s.status === 401, `status=${s.status}`);

  s = await json(null, "/api/teacher");
  check("A3 GET /api/teacher sin sesión → 401", s.status === 401, `status=${s.status}`);

  r = await req(null, "/dashboard", {});
  check("A4 GET /dashboard sin sesión redirige a /login", r.status === 307 && (r.headers.get("location") || "").includes("/login"), `status=${r.status}`);

  // ---- B. Login negativo ----
  let bad = await login("laura.avanzado@utb.edu.co", "clave-mala");
  check("B1 Login con clave mala falla", !bad.ok, bad.detail);
  bad = await login("intruso@gmail.com", PASS);
  check("B2 Login con dominio no institucional falla", !bad.ok, bad.detail);

  // ---- C. Estudiante avanzado (solo lectura) ----
  const laura = await login("laura.avanzado@utb.edu.co", PASS);
  check("C0 Login Laura", laura.ok, laura.detail);
  const L = laura.jar;

  s = await json(L, "/api/student");
  check("C1 /api/student 200 + código", s.status === 200 && s.body?.profile?.studentCode === "2022123456", `pts=${s.body?.stats?.totalPoints}`);
  check("C2 Total puntos Laura = 1520", s.body?.stats?.totalPoints === 1520, `total=${s.body?.stats?.totalPoints}`);
  check("C3 Nivel Explorador + racha 7", s.body?.stats?.currentLevel === "Explorador" && s.body?.stats?.streak?.current >= 7, `nivel=${s.body?.stats?.currentLevel} racha=${s.body?.stats?.streak?.current}`);
  check("C4 Notificaciones con Ruta recomendada sin leer", has(s.body?.notifications, (n) => !n.isRead && n.title.includes("Ruta recomendada")), `unread=${s.body?.unreadCount}`);

  s = await json(L, "/api/missions");
  const sts = (s.body?.missions || []).map((m) => m.status);
  check("C5 /api/missions estados", s.status === 200 && ["COMPLETADA", "VERIFICADA", "EN_REVISION", "EN_PROGRESO", "PENDIENTE"].every((e) => sts.includes(e)), sts.join(","));
  check("C6 Stats misiones coherentes", (s.body?.stats?.completed || 0) >= 4, JSON.stringify(s.body?.stats));

  s = await json(L, "/api/rewards");
  check("C7 /api/rewards 3 estados de canje", has(s.body?.rewards, (x) => x.earned?.status === "SOLICITADO") && has(s.body?.rewards, (x) => x.earned?.status === "APROBADO") && has(s.body?.rewards, (x) => x.earned?.status === "RECHAZADO"), `total=${s.body?.stats?.totalPoints}`);
  check("C8 Cursos matriculados vigentes", has(s.body?.enrolledCourses, (c) => c.code === "C04A") && has(s.body?.enrolledCourses, (c) => c.code === "C05A"), (s.body?.enrolledCourses || []).map((c) => c.code).join(","));

  s = await json(L, "/api/curriculum");
  check("C9 /api/curriculum 10 semestres", s.status === 200 && (s.body?.semesters || []).length === 10, `sem=${(s.body?.semesters || []).length}`);

  s = await json(L, "/api/stats");
  check("C10 /api/stats promedio y créditos", s.status === 200 && s.body?.overall?.averageGrade > 0 && s.body?.overall?.creditsApproved > 0, `avg=${s.body?.overall?.averageGrade} cr=${s.body?.overall?.creditsApproved}`);

  s = await json(L, "/api/recommendations");
  check("C11 /api/recommendations genera lista", s.status === 200 && Array.isArray(s.body) && s.body.length > 0, `n=${s.body?.length}`);

  s = await json(L, "/api/notifications");
  check("C12 /api/notifications con ALERTA_RIESGO", has(s.body?.notifications, (n) => n.type === "ALERTA_RIESGO"), `n=${s.body?.notifications?.length}`);

  s = await json(L, "/api/badges");
  check("C13 /api/badges modo local (Meritcoin desconectado)", s.status === 200 && (s.body?.stats?.earned || 0) >= 2 && s.body?.meritcoin?.connected === false, `earned=${s.body?.stats?.earned} connected=${s.body?.meritcoin?.connected}`);

  s = await json(L, "/api/teacher");
  check("C14 Estudiante no entra a /api/teacher (403)", s.status === 403, `status=${s.status}`);

  // ---- D. Docente 1 (solo lectura) ----
  const doc1 = await login("docente@utb.edu.co", PASS);
  check("D0 Login docente María", doc1.ok, doc1.detail);
  const T = doc1.jar;

  s = await json(T, "/api/teacher");
  const names = (s.body?.courses || []).flatMap((c) => c.students.map((x) => x.name));
  check("D1 4 cursos asignados", (s.body?.courses || []).length === 4, (s.body?.courses || []).map((c) => c.code).join(","));
  check("D2 Ve a Laura/Diego/Sofía y NO a Miguel", names.includes("Laura Avanzado") && names.includes("Diego Riesgo") && names.includes("Sofía Nueva") && !names.includes("Miguel Torres"), names.join(" | "));
  check("D3 Diego marcado en riesgo", (s.body?.courses || []).flatMap((c) => c.students).some((x) => x.name === "Diego Riesgo" && !!x.risk), "");
  check("D4 2 misiones EN_REVISION (Laura+Diego)", (s.body?.pendingMissions || []).length === 2, (s.body?.pendingMissions || []).map((m) => `${m.studentName}:${m.title}`).join(" | "));

  s = await json(T, "/api/teacher/rewards");
  check("D5 2 canjes pendientes + historial", (s.body?.pending || []).length === 2 && (s.body?.reviewed || []).length >= 2, `pending=${s.body?.pending?.length} reviewed=${s.body?.reviewed?.length}`);

  s = await json(T, "/api/student");
  check("D6 Docente no entra a /api/student", s.status !== 200, `status=${s.status}`);

  s = await json(T, "/api/search?q=laura");
  check("D7 Búsqueda global encuentra a Laura", (s.body?.results || []).some((x) => JSON.stringify(x).toLowerCase().includes("laura")), `n=${s.body?.results?.length}`);

  // ---- E. Docente 2 aislado ----
  const doc2 = await login("carlos.ruiz@utb.edu.co", PASS);
  check("E0 Login docente Carlos", doc2.ok, doc2.detail);
  s = await json(doc2.jar, "/api/teacher");
  const names2 = (s.body?.courses || []).flatMap((c) => c.students.map((x) => x.name));
  const miguel = (s.body?.courses || []).flatMap((c) => c.students.map((x) => ({ id: x.id, name: x.name }))).find((x) => x.name === "Miguel Torres");
  check("E1 Carlos ve SOLO a Miguel", names2.length === 1 && names2[0] === "Miguel Torres", names2.join(","));

  // ---- F. Mutación: aprobar misión de Laura ----
  s = await json(T, "/api/teacher");
  const ensayoLaura = (s.body?.pendingMissions || []).find((m) => m.studentName === "Laura Avanzado");
  check("F0 Ensayo de Laura pendiente", !!ensayoLaura, ensayoLaura?.id || "");
  if (ensayoLaura) {
    const patch = await json(T, "/api/teacher", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentMissionId: ensayoLaura.id, decision: "approve", comment: "Buen trabajo" }) });
    check("F1 PATCH aprueba misión → 200", patch.status === 200, `status=${patch.status}`);
    const after = await json(T, "/api/teacher");
    check("F2 Misión sale de pendientes", !(after.body?.pendingMissions || []).some((m) => m.id === ensayoLaura.id), `pendientes=${after.body?.pendingMissions?.length}`);
    const pts = await json(L, "/api/student");
    check("F3 Laura suma +300 pts (1520→1820)", pts.body?.stats?.totalPoints === 1820, `total=${pts.body?.stats?.totalPoints}`);
  }

  // ---- G. Mutación: rechazar canje de Diego con reembolso ----
  s = await json(T, "/api/teacher/rewards");
  const canjeDiego = (s.body?.pending || []).find((x) => x.studentName === "Diego Riesgo");
  check("G0 Canje de Diego pendiente", !!canjeDiego, canjeDiego?.id || "");
  if (canjeDiego) {
    const patch = await json(T, "/api/teacher/rewards", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentRewardId: canjeDiego.id, decision: "reject", comment: "Validación E2E" }) });
    check("G1 PATCH rechaza canje → 200", patch.status === 200, `status=${patch.status}`);
    const diego = await login("diego.riesgo@utb.edu.co", PASS);
    const pts = await json(diego.jar, "/api/student");
    check("G2 Diego reembolsado +600 (250→850)", pts.body?.stats?.totalPoints === 850, `total=${pts.body?.stats?.totalPoints}`);
  }

  // ---- H. Mutación: flujo estudiante Sofía (start → complete auto) ----
  const sofia = await login("sofia.nueva@utb.edu.co", PASS);
  check("H0 Login Sofía", sofia.ok, sofia.detail);
  s = await json(sofia.jar, "/api/missions");
  const planificar = (s.body?.missions || []).find((m) => m.title === "Planificar Próximo Semestre");
  check("H1 Misión PENDIENTE disponible", planificar?.status === "PENDIENTE", `${planificar?.status}`);
  if (planificar) {
    let p = await json(sofia.jar, "/api/missions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ missionId: planificar.id, action: "start" }) });
    check("H2 start → EN_PROGRESO", p.status === 200, `status=${p.status}`);
    p = await json(sofia.jar, "/api/missions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ missionId: planificar.id, action: "complete" }) });
    check("H3 complete auto → COMPLETADA + puntos", p.status === 200, `status=${p.status} ${JSON.stringify(p.body).slice(0, 100)}`);
    const pts = await json(sofia.jar, "/api/student");
    check("H4 Sofía 0→150 pts", pts.body?.stats?.totalPoints === 150, `total=${pts.body?.stats?.totalPoints}`);
  }

  // ---- I. Mutación: ruta recomendada + guardia 403 ----
  if (miguel) {
    const neg = await json(T, "/api/teacher/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId: miguel.id }) });
    check("I1 Docente1 NO puede notificar a Miguel (403)", neg.status === 403, `status=${neg.status}`);
    const pos = await json(doc2.jar, "/api/teacher/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId: miguel.id, customMessage: "Validación E2E" }) });
    check("I2 Docente2 notifica a Miguel → 201/200", pos.status === 200 || pos.status === 201, `status=${pos.status}`);
  } else {
    check("I1/I2 ids de Miguel", false, "sin id de Miguel");
  }

  // ---- J. Páginas con sesión ----
  r = await req(L, "/dashboard");
  check("J1 /dashboard con sesión → 200", r.status === 200, `status=${r.status}`);
  r = await req(T, "/docentes");
  check("J2 /docentes con sesión docente → 200", r.status === 200, `status=${r.status}`);

  const failed = results.filter((x) => !x.pass);
  console.log(`\n===== ${results.length - failed.length}/${results.length} checks OK =====`);
  if (failed.length) { console.log("FALLIDOS:", failed.map((f) => f.name).join(" | ")); process.exit(1); }
}

main().catch((e) => { console.error("ERROR fatal:", e); process.exit(1); });
