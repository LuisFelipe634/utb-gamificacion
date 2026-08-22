"use client"

import { useState } from "react"
import {
  Bell,
  AlertTriangle,
  Info,
  Trophy,
  Target,
  Clock,
  CheckCircle,
  X
} from "lucide-react"

// Datos de ejemplo
const mockNotifications = [
  {
    id: 1,
    type: "ALERTA_RIESGO",
    title: "Riesgo de atraso en Redes",
    message: "Faltan 2 créditos de prerrequisito para inscribir Redes de Computadores en el próximo semestre.",
    isRead: false,
    createdAt: "2024-08-20T10:30:00",
    icon: AlertTriangle,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-900/20"
  },
  {
    id: 2,
    type: "MISION_DISPONIBLE",
    title: "Nueva misión disponible",
    message: "Se ha desbloqueado la misión 'Investigador'. Participa en un proyecto de investigación y gana 300 puntos.",
    isRead: false,
    createdAt: "2024-08-19T14:20:00",
    icon: Target,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20"
  },
  {
    id: 3,
    type: "LOGRO_OBTENIDO",
    title: "¡Nueva insignia desbloqueada!",
    message: "Has obtenido la insignia 'Constante' por asistir a clases por 4 semanas consecutivas.",
    isRead: true,
    createdAt: "2024-08-18T09:15:00",
    icon: Trophy,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20"
  },
  {
    id: 4,
    type: "RECORDATORIO",
    title: "Planifica tu próximo semestre",
    message: "El periodo de inscripción abre en 2 semanas. Revisa tu malla y planifica tus cursos.",
    isRead: true,
    createdAt: "2024-08-17T11:00:00",
    icon: Clock,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20"
  },
  {
    id: 5,
    type: "INFO",
    title: "Actualización del sistema",
    message: "Se han agregado nuevas estadísticas de progreso por competencia. ¡Revísalo!",
    isRead: true,
    createdAt: "2024-08-16T16:45:00",
    icon: Info,
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-50 dark:bg-gray-700/50"
  },
  {
    id: 6,
    type: "MISION_DISPONIBLE",
    title: "Misión semanal disponible",
    message: "Completa 5 horas de estudio autónomo esta semana y gana 100 puntos.",
    isRead: false,
    createdAt: "2024-08-15T08:00:00",
    icon: Target,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20"
  }
]

export default function Notificaciones() {
  const [notifications, setNotifications] = useState(mockNotifications)
  const [filter, setFilter] = useState<string>("all")

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "all") return true
    if (filter === "unread") return !notification.isRead
    return notification.type === filter
  })

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const deleteNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notificaciones</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {unreadCount > 0
              ? `Tienes ${unreadCount} notificación${unreadCount > 1 ? "es" : ""} sin leer`
              : "No tienes notificaciones nuevas"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            Marcar todo como leído
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "all", label: "Todas" },
          { key: "unread", label: "No leídas" },
          { key: "ALERTA_RIESGO", label: "Alertas" },
          { key: "MISION_DISPONIBLE", label: "Misiones" },
          { key: "LOGRO_OBTENIDO", label: "Logros" }
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.map((notification) => {
          const Icon = notification.icon

          return (
            <div
              key={notification.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border p-4 transition-all ${
                notification.isRead
                  ? "border-gray-200 dark:border-gray-700"
                  : "border-blue-300 dark:border-blue-600 shadow-sm"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${notification.bg}`}>
                  <Icon className={`w-5 h-5 ${notification.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`font-medium ${
                        notification.isRead
                          ? "text-gray-700 dark:text-gray-300"
                          : "text-gray-900 dark:text-white"
                      }`}>
                        {notification.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(notification.createdAt).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Marcar como leído
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {filteredNotifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No hay notificaciones</p>
          </div>
        )}
      </div>
    </div>
  )
}
