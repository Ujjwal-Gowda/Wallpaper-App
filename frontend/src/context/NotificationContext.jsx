import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { CheckCircle, X, AlertTriangle, Info, Bell } from "lucide-react";
import { useTheme } from "./ThemeContext.jsx";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { id, msg, type }]); // max 5 visible
    setTimeout(() => {
      setToasts((prev) => prev.filter((n) => n.id !== id));
    }, duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Persistent notification bell (for things like new chat messages)
  const addNotification = useCallback(
    (msg, type = "info") => {
      const id = Date.now() + Math.random();
      setNotifications((prev) =>
        [{ id, msg, type, read: false, time: new Date() }, ...prev].slice(
          0,
          20,
        ),
      );
      addToast(msg, type);
      return id;
    },
    [addToast],
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        addToast,
        addNotification,
        notifications,
        markAllRead,
        clearAll,
        unread: notifications.filter((n) => !n.read).length,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  return ctx;
}

// ─── Toast Container ─────────────────────────────────────────────────────────
function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[10001] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onRemove={onRemove} />
      ))}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(80px) scale(0.92); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to   { opacity: 0; transform: translateX(80px) scale(0.92); }
        }
      `}</style>
    </div>
  );
}

function Toast({ toast, onRemove }) {
  const config = {
    success: {
      bg: "linear-gradient(135deg, #22c55e, #16a34a)",
      Icon: CheckCircle,
    },
    error: {
      bg: "linear-gradient(135deg, #ef4444, #dc2626)",
      Icon: X,
    },
    warning: {
      bg: "linear-gradient(135deg, #f59e0b, #d97706)",
      Icon: AlertTriangle,
    },
    info: {
      bg: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
      Icon: Info,
    },
    chat: {
      bg: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
      Icon: Bell,
    },
  };

  const { bg, Icon } = config[toast.type] || config.info;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium max-w-sm pointer-events-auto text-white cursor-pointer select-none"
      style={{
        background: bg,
        animation: "toastIn 0.35s cubic-bezier(.22,.68,0,1.2)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.15)",
      }}
      onClick={() => onRemove(toast.id)}
    >
      <Icon size={16} className="shrink-0" />
      <span className="flex-1 leading-snug">{toast.msg}</span>
      <X size={13} className="shrink-0 opacity-60 hover:opacity-100" />
    </div>
  );
}

// ─── Notification Bell (for sidebar / header) ─────────────────────────────────
export function NotificationBell() {
  const { notifications, markAllRead, clearAll, unread } = useNotifications();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);

  const isDark =
    theme === "dark" ||
    theme === "synthwave" ||
    theme === "night" ||
    theme === "dracula" ||
    theme === "halloween" ||
    theme === "forest" ||
    theme === "black" ||
    theme === "luxury" ||
    theme === "coffee" ||
    theme === "business";

  useEffect(() => {
    if (open) markAllRead();
  }, [open, markAllRead]);

  return (
    <div className="relative">
      <button
        className="btn btn-ghost btn-circle relative"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[9990]"
            onClick={() => setOpen(false)}
          />
          <div
            className={`absolute left-full bottom-0 ml-4 z-[9991] w-80 rounded-2xl shadow-2xl border border-base-300 overflow-hidden animate-in fade-in slide-in-from-left-5 duration-200 ${
              isDark ? "bg-[#0a0a0a] text-white" : "bg-gray-200 text-gray-900"
            }`}
          >
            <div
              className={`flex items-center justify-between px-4 py-3 border-b border-base-300 ${
                isDark ? "bg-white/5" : "bg-black/5"
              }`}
            >
              <h3 className="font-bold">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  className="text-xs text-secondary hover:text-secondary-focus transition-colors font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAll();
                  }}
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-10 opacity-40">
                  <Bell size={28} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-base-300/50 transition-colors ${
                      isDark ? "hover:bg-white/10" : "hover:bg-black/10"
                    } ${!n.read ? (isDark ? "bg-primary/20" : "bg-primary/10") : ""}`}
                  >
                    <p className="text-sm leading-snug font-medium">{n.msg}</p>
                    <p className="text-[10px] uppercase tracking-wider opacity-40 mt-1.5 font-bold">
                      {n.time.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
