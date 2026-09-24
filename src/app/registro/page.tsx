"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { GraduationCap, Mail, Lock, User, Hash, KeyRound } from "lucide-react";

type Step = "request" | "verify";

export default function RegistroPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [needsStudentCode, setNeedsStudentCode] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo enviar el código");
        return;
      }
      setInfo(
        data.via === "console-dev"
          ? "Código enviado (modo desarrollo: revisa la consola del servidor)."
          : "Código enviado a tu correo institucional. Revisa tu bandeja."
      );
      setStep("verify");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          name,
          password,
          ...(needsStudentCode ? { studentCode } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "STUDENT_CODE_REQUIRED") setNeedsStudentCode(true);
        setError(data.error || "Código inválido");
        return;
      }
      // Auto-login tras registro exitoso
      const login = await signIn("credentials", { email, password, redirect: false });
      if (login?.error) {
        setInfo("Cuenta creada. Ahora inicia sesión.");
        router.push("/login");
        return;
      }
      router.push("/malla");
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex aspect-square h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Crear cuenta UTB</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Solo correos @utb.edu.co. Verificamos tu buzón con un código.</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          {step === "request" ? (
            <form onSubmit={requestCode} className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Correo institucional</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="2019123456@utb.edu.co o nombre@utb.edu.co"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <button disabled={loading} className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg disabled:opacity-50">
                {loading ? "Enviando..." : "Enviar código"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código de 6 dígitos" inputMode="numeric" maxLength={6} className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (8+, mayús + número)" className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              {(needsStudentCode || studentCode) && (
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input value={studentCode} onChange={(e) => setStudentCode(e.target.value)} placeholder="Código estudiantil (8-10 dígitos)" inputMode="numeric" className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              {!needsStudentCode && (
                <button type="button" onClick={() => setNeedsStudentCode((v) => !v)} className="text-xs text-blue-600 hover:underline">
                  Mi correo no contiene mi código (usar código manual)
                </button>
              )}
              <button disabled={loading} className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg disabled:opacity-50">
                {loading ? "Verificando..." : "Verificar y crear cuenta"}
              </button>
              <button type="button" onClick={() => setStep("request")} className="w-full text-sm text-gray-500 hover:underline">
                Reenviar código
              </button>
            </form>
          )}

          {error && <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
          {info && <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 rounded-lg text-sm text-emerald-700">{info}</div>}

          <p className="mt-6 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta? <Link href="/login" className="text-blue-600 hover:underline">Inicia sesión</Link>
          </p>
          <p className="mt-2 text-center text-xs text-gray-400">Docentes: el alta la realiza un administrador.</p>
        </div>
      </div>
    </div>
  );
}
