/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import type { ReactNode, FC } from "react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
} from "recharts";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const API_URL = "http://localhost:5000/api/admin";

const adminFetch = async (path: string, token: string, options: RequestInit = {}): Promise<any> => {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> || {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
};

// ─── TYPES ─────────────────────────────────────────────────────────────────
type Section = "dashboard" | "users" | "messages" | "modules" | "analytics" | "system" | "audit";
type BtnVariant = "default" | "danger" | "success" | "ghost" | "primary" | "amber";
type BtnSize = "sm" | "md" | "lg";

interface AuthState {
  token: string | null;
  admin: { email: string; name: string } | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  subscription: string;
  is_online: boolean;
  is_banned?: boolean;
  last_active?: string;
  created_at?: string;
  module_count: number;
}

interface Message {
  _id: string;
  senderId: string;
  roomId: string;
  content?: string;
  type?: string;
  status?: string;
  timestamp: string;
  deletedForEveryone?: boolean;
  attachmentUrl?: string;
  readBy?: string[];
  reactions?: any[];
}

interface Module {
  id: string;
  name: string;
  code: string;
  user_count: number;
}

interface AuditEntry {
  id: string;
  created_at: string;
  admin_name?: string;
  action: string;
  target_type: string;
  target_id?: string;
  details?: string;
  ip_address?: string;
}

interface HealthData {
  status: string;
  maintenanceMode: boolean;
  database: { status: string; latency: string };
  mongodb: { status: string; latency: string };
  uptime: number;
  memory: { heapUsed: number; heapTotal: number; rss: number };
  nodeVersion: string;
  environment: string;
  stats: { onlineUsers: number; totalUsers: number; totalMessages: number };
}

interface UserDetail {
  user: User;
  enrollments: { name: string; code: string }[];
  rooms: { id: string; type: string; name: string }[];
  messageCount: number;
  recentMessages: Message[];
  isBanned: boolean;
  banDetails?: { reason?: string; expires_at?: string; banned_at?: string } | null;
}

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────
const C = {
  bg: "#080C14",
  surface: "#0D1320",
  surfaceHigh: "#111928",
  border: "rgba(255,255,255,0.06)",
  borderHover: "rgba(255,255,255,0.12)",
  text: "#E8EDF5",
  textMuted: "#6B7A99",
  textDim: "#3D4C6B",
  accent: "#4F8EF7",
  green: "#22D3A0",
  amber: "#F5A623",
  red: "#F05252",
  purple: "#A78BFA",
  cyan: "#22D3EE",
} as const;

// ─── GLOBAL STYLES ──────────────────────────────────────────────────────────
const GlobalStyles: FC = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body, html {
      background: ${C.bg};
      font-family: 'Geist', 'SF Pro Display', system-ui, sans-serif;
      color: ${C.text};
      -webkit-font-smoothing: antialiased;
    }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
    input, textarea, select { font-family: 'Geist', sans-serif; }
    select option { background: #0D1320; color: #E8EDF5; }
    @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.85)} }
    @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes slideIn { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
    @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    @keyframes spin { to { transform: rotate(360deg); } }
    .fade-in { animation: fadeIn 0.25s ease forwards; }
    .slide-in { animation: slideIn 0.2s ease forwards; }
    .skeleton {
      background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 6px;
    }
    .row-hover:hover { background: rgba(79,142,247,0.04) !important; }
    .nav-item { transition: all 0.15s ease; }
    .nav-item:hover { background: rgba(255,255,255,0.04) !important; color: ${C.text} !important; }
    .btn-hover { transition: all 0.15s ease; }
    .btn-hover:hover { filter: brightness(1.15); transform: translateY(-1px); }
    .btn-hover:active { transform: translateY(0); filter: brightness(0.95); }
    .card-hover { transition: border-color 0.2s ease, box-shadow 0.2s ease; }
    .card-hover:hover { border-color: rgba(79,142,247,0.25) !important; box-shadow: 0 0 24px rgba(79,142,247,0.06) !important; }
  `}</style>
);

// ─── PRIMITIVES ──────────────────────────────────────────────────────────────

interface CardProps { children: ReactNode; style?: React.CSSProperties; hover?: boolean; onClick?: () => void; }
const Card: FC<CardProps> = ({ children, style, hover, onClick }) => (
  <div onClick={onClick} className={hover ? "card-hover" : ""}
    style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", cursor: onClick ? "pointer" : "default", ...style }}>
    {children}
  </div>
);

interface TagProps { label: string; color?: string; dot?: boolean; }
const Tag: FC<TagProps> = ({ label, color = C.accent, dot }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    background: `${color}14`, color, border: `1px solid ${color}28`,
    borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600,
    letterSpacing: 0.4, whiteSpace: "nowrap", fontFamily: "'Geist Mono', monospace",
    textTransform: "uppercase",
  }}>
    {dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block" }} />}
    {label}
  </span>
);

interface PillProps { value: string | number; color?: string; }
const Pill: FC<PillProps> = ({ value, color = C.accent }) => (
  <span style={{ background: `${color}18`, color, borderRadius: 20, padding: "1px 10px", fontSize: 12, fontWeight: 700, fontFamily: "'Geist Mono', monospace" }}>
    {value}
  </span>
);

interface BtnProps {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  variant?: BtnVariant;
  size?: BtnSize;
  disabled?: boolean;
  loading?: boolean;
  style?: React.CSSProperties;
  type?: "button" | "submit";
}
const Btn: FC<BtnProps> = ({ children, onClick, variant = "default", size = "md", disabled, loading, style: extraStyle, type = "button" }) => {
  const variants: Record<BtnVariant, React.CSSProperties> = {
    default: { background: `${C.accent}18`, color: C.accent, border: `1px solid ${C.accent}30` },
    danger:  { background: `${C.red}18`,    color: C.red,    border: `1px solid ${C.red}30` },
    success: { background: `${C.green}18`,  color: C.green,  border: `1px solid ${C.green}30` },
    ghost:   { background: "transparent",   color: C.textMuted, border: `1px solid ${C.border}` },
    primary: { background: C.accent,        color: "#fff",   border: `1px solid ${C.accent}` },
    amber:   { background: `${C.amber}18`,  color: C.amber,  border: `1px solid ${C.amber}30` },
  };
  const sizes: Record<BtnSize, React.CSSProperties> = {
    sm: { padding: "4px 10px", fontSize: 11, borderRadius: 7 },
    md: { padding: "7px 14px", fontSize: 12.5, borderRadius: 9 },
    lg: { padding: "10px 20px", fontSize: 14, borderRadius: 10 },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className="btn-hover"
      style={{ ...variants[variant], ...sizes[size], fontWeight: 600, cursor: (disabled || loading) ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", letterSpacing: 0.2, ...extraStyle }}>
      {loading && <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
      {children}
    </button>
  );
};

interface InputProps { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string; style?: React.CSSProperties; }
const Input: FC<InputProps> = ({ value, onChange, placeholder, type = "text", style: extra }) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder}
    style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", width: "100%", ...extra }}
    onFocus={e => (e.target.style.borderColor = `${C.accent}60`)}
    onBlur={e => (e.target.style.borderColor = C.border)} />
);

interface TextareaProps { value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder?: string; rows?: number; }
const Textarea: FC<TextareaProps> = ({ value, onChange, placeholder, rows = 3 }) => (
  <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
    style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 12px", color: C.text, fontSize: 13, outline: "none", width: "100%", resize: "vertical", fontFamily: "'Geist', sans-serif", lineHeight: 1.5 }}
    onFocus={e => (e.target.style.borderColor = `${C.accent}60`)}
    onBlur={e => (e.target.style.borderColor = C.border)} />
);

interface SelectProps { value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: ReactNode; style?: React.CSSProperties; }
const SelectInput: FC<SelectProps> = ({ value, onChange, children, style: extra }) => (
  <select value={value} onChange={onChange}
    style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 9, padding: "7px 10px", color: C.text, fontSize: 12.5, cursor: "pointer", outline: "none", fontWeight: 500, ...extra }}>
    {children}
  </select>
);

const Divider: FC = () => <div style={{ height: 1, background: C.border, margin: "16px 0" }} />;

// ─── MODAL ──────────────────────────────────────────────────────────────────
interface ModalProps { title: string; subtitle?: string; children: ReactNode; onClose: () => void; width?: number; }
const Modal: FC<ModalProps> = ({ title, subtitle, children, onClose, width = 520 }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="fade-in" style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: width, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h3 style={{ color: C.text, fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>{title}</h3>
          {subtitle && <p style={{ color: C.textMuted, fontSize: 12.5, marginTop: 4 }}>{subtitle}</p>}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.textDim, fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 4 }}
          onMouseEnter={e => ((e.target as HTMLElement).style.color = C.text)}
          onMouseLeave={e => ((e.target as HTMLElement).style.color = C.textDim)}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

// ─── TABLE ──────────────────────────────────────────────────────────────────
interface ThProps { children?: ReactNode; w?: string; }
const Th: FC<ThProps> = ({ children, w }) => (
  <th style={{ padding: "9px 14px", textAlign: "left", color: C.textDim, fontWeight: 600, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap", width: w, borderBottom: `1px solid ${C.border}` }}>
    {children}
  </th>
);

interface TdProps { children?: ReactNode; mono?: boolean; dim?: boolean; mw?: string; }
const Td: FC<TdProps> = ({ children, mono, dim, mw }) => (
  <td style={{ padding: "11px 14px", color: dim ? C.textMuted : C.text, fontFamily: mono ? "'Geist Mono', monospace" : "inherit", fontSize: mono ? 11.5 : 13, maxWidth: mw, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: mw ? "nowrap" : "normal" }}>
    {children}
  </td>
);

interface TableRowProps { children: ReactNode; onClick?: () => void; highlight?: boolean; }
const TableRow: FC<TableRowProps> = ({ children, onClick, highlight }) => (
  <tr className="row-hover" onClick={onClick}
    style={{ borderBottom: `1px solid ${C.border}`, cursor: onClick ? "pointer" : "default", background: highlight ? `${C.accent}08` : "transparent", transition: "background 0.12s" }}>
    {children}
  </tr>
);

// ─── STAT CARD ───────────────────────────────────────────────────────────────
interface StatCardProps { label: string; value?: string | number; sub?: string; color: string; icon: string; trend?: number; }
const StatCard: FC<StatCardProps> = ({ label, value, sub, color, icon, trend }) => (
  <div className="card-hover" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: 0.6 }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}14`, border: `1px solid ${color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{icon}</div>
      {trend !== undefined && <span style={{ color: trend >= 0 ? C.green : C.red, fontSize: 11, fontWeight: 600, fontFamily: "'Geist Mono', monospace" }}>{trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%</span>}
    </div>
    <div style={{ fontSize: 28, fontWeight: 800, color: C.text, fontFamily: "'Geist Mono', monospace", letterSpacing: -1, lineHeight: 1 }}>{value ?? "—"}</div>
    <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 6, fontWeight: 500 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color, marginTop: 5, fontWeight: 600 }}>{sub}</div>}
  </div>
);

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
interface SectionHeaderProps { title: string; subtitle?: string; actions?: ReactNode; live?: boolean; }
const SectionHeader: FC<SectionHeaderProps> = ({ title, subtitle, actions, live }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: -0.6, margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ color: C.textMuted, fontSize: 13, marginTop: 5 }}>{subtitle}</p>}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {live && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: `${C.green}12`, border: `1px solid ${C.green}20`, borderRadius: 20, padding: "4px 10px" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, animation: "pulse-dot 2s infinite" }} />
          <span style={{ color: C.green, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>LIVE</span>
        </div>
      )}
      {actions}
    </div>
  </div>
);

// ─── PAGINATION ──────────────────────────────────────────────────────────────
interface PaginationProps { page: number; totalPages: number; onChange: (p: number) => void; }
const Pagination: FC<PaginationProps> = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 20 }}>
      <Btn size="sm" variant="ghost" onClick={() => onChange(page - 1)} disabled={page === 1}>‹ Prev</Btn>
      {start > 1 && <><span style={{ color: C.textDim, fontSize: 13 }}>1</span><span style={{ color: C.textDim }}>…</span></>}
      {pages.map(p => (
        <button key={p} onClick={() => onChange(p)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${p === page ? C.accent : C.border}`, background: p === page ? `${C.accent}20` : "transparent", color: p === page ? C.accent : C.textMuted, cursor: "pointer", fontSize: 12.5, fontWeight: p === page ? 700 : 500 }}>{p}</button>
      ))}
      {end < totalPages && <><span style={{ color: C.textDim }}>…</span><span style={{ color: C.textDim, fontSize: 13 }}>{totalPages}</span></>}
      <Btn size="sm" variant="ghost" onClick={() => onChange(page + 1)} disabled={page === totalPages}>Next ›</Btn>
    </div>
  );
};

// ─── SKELETON ────────────────────────────────────────────────────────────────
const SkeletonRow: FC<{ cols?: number }> = ({ cols = 6 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} style={{ padding: "12px 14px" }}>
        <div className="skeleton" style={{ height: 14, width: `${60 + (i * 7) % 30}%` }} />
      </td>
    ))}
  </tr>
);

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
const Empty: FC<{ icon?: string; text?: string }> = ({ icon = "🔍", text = "No data found" }) => (
  <div style={{ padding: "48px 24px", textAlign: "center" }}>
    <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
    <div style={{ color: C.textMuted, fontSize: 13 }}>{text}</div>
  </div>
);

// ─── TOAST ───────────────────────────────────────────────────────────────────
interface ToastEntry { id: number; message: string; type: "success" | "error" | "warning"; }

const ToastItem: FC<{ message: string; type: string; onDone: () => void }> = ({ message, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  const color = type === "success" ? C.green : type === "error" ? C.red : C.amber;
  return (
    <div style={{ background: C.surface, border: `1px solid ${color}40`, borderLeft: `3px solid ${color}`, borderRadius: 10, padding: "12px 18px", color: C.text, fontSize: 13, fontWeight: 500, boxShadow: `0 8px 30px rgba(0,0,0,0.4), 0 0 20px ${color}20`, animation: "fadeIn 0.2s ease", maxWidth: 320 }}>
      {message}
    </div>
  );
};

const useToast = () => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const show = useCallback((message: string, type: "success" | "error" | "warning" = "success") => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  }, []);
  const remove = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  const ToastContainer = (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => <ToastItem key={t.id} message={t.message} type={t.type} onDone={() => remove(t.id)} />)}
    </div>
  );
  return { show, ToastContainer };
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
interface LoginPageProps { onLogin: (token: string, admin: { email: string; name: string }) => void; }
const LoginPage: FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");
      onLogin(data.token, data.admin);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(ellipse 800px 600px at 10% 40%, rgba(79,142,247,0.07) 0%, transparent 70%), radial-gradient(ellipse 600px 500px at 90% 60%, rgba(34,211,160,0.05) 0%, transparent 70%)` }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`, backgroundSize: "48px 48px", opacity: 0.4 }} />
      <div className="fade-in" style={{ position: "relative", width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 16, background: `${C.accent}10`, border: `1px solid ${C.accent}20`, borderRadius: 14, padding: "10px 18px" }}>
            <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${C.accent}, ${C.cyan})`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: -0.5 }}>ChezaX</div>
              <div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>Control Tower</div>
            </div>
          </div>
          <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.5 }}>Restricted access — authorized personnel only</p>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 32, boxShadow: "0 40px 100px rgba(0,0,0,0.5)" }}>
          {error && (
            <div style={{ background: `${C.red}12`, border: `1px solid ${C.red}25`, borderLeft: `3px solid ${C.red}`, borderRadius: 9, padding: "11px 14px", color: C.red, fontSize: 13, marginBottom: 20 }}>
              ⚠ {error}
            </div>
          )}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: C.textMuted, fontSize: 11.5, fontWeight: 600, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.8 }}>Email address</label>
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="admin@chezax.com" />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", color: C.textMuted, fontSize: 11.5, fontWeight: 600, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.8 }}>Password</label>
              <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="btn-hover"
              style={{ width: "100%", background: `linear-gradient(135deg, ${C.accent}, ${C.cyan})`, color: "#fff", border: "none", borderRadius: 11, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.75 : 1, letterSpacing: 0.3 }}>
              {loading ? "Authenticating…" : "Access Admin Panel →"}
            </button>
          </form>
        </div>
        <p style={{ textAlign: "center", color: C.textDim, fontSize: 11.5, marginTop: 20 }}>All actions are logged and monitored</p>
      </div>
    </div>
  );
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const ACTION_COLOR: Record<string, string> = {
  DELETE_USER: C.red, BAN_USER: C.amber, UNBAN_USER: C.green,
  UPDATE_USER: C.accent, DELETE_MESSAGE: C.red,
  ENABLE_MAINTENANCE: C.red, DISABLE_MAINTENANCE: C.green,
  REMOVE_ENROLLMENT: C.purple,
};

const Dashboard: FC<{ token: string }> = ({ token }) => {
  const [stats, setStats] = useState<Record<string, any> | null>(null);
  const [activity, setActivity] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([adminFetch("/dashboard/stats", token), adminFetch("/dashboard/activity", token)]);
      setStats(s); setActivity(a);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); const iv = setInterval(load, 15000); return () => clearInterval(iv); }, [load]);

  if (loading) return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14 }} />)}
    </div>
  );

  return (
    <div className="fade-in">
      <SectionHeader title="Command Center" subtitle="Platform overview — auto-refreshes every 15s" live />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Users" value={stats?.totalUsers?.toLocaleString()} icon="👥" color={C.accent} sub={`${stats?.onlineUsers} online now`} />
        <StatCard label="Total Messages" value={typeof stats?.totalMessages === "number" ? stats.totalMessages.toLocaleString() : stats?.totalMessages} icon="💬" color={C.green} sub={`+${stats?.todayMessages} today`} />
        <StatCard label="Chat Rooms" value={stats?.totalRooms} icon="🏠" color={C.amber} />
        <StatCard label="Modules" value={stats?.totalModules} icon="📚" color={C.purple} sub={`${stats?.totalEnrollments} enrolled`} />
        <StatCard label="Active Today" value={stats?.activeToday} icon="⚡" color={C.cyan} />
        <StatCard label="Banned Users" value={stats?.bannedUsers} icon="🚫" color={C.red} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 18 }}>
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Recent User Activity</span>
            <Tag label="LIVE" color={C.green} dot />
          </div>
          <div style={{ padding: "8px 0" }}>
            {(activity?.recentUsers ?? []).slice(0, 8).map((u: User) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: `1px solid ${C.border}`, transition: "background 0.12s" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = C.surfaceHigh)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: u.is_online ? `${C.green}15` : C.surfaceHigh, border: `1px solid ${u.is_online ? `${C.green}30` : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                  {u.role === "teacher" ? "👨‍🏫" : "🎓"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                  <div style={{ color: C.textDim, fontSize: 11, marginTop: 1 }}>{u.email}</div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {u.is_online ? <Tag label="Online" color={C.green} dot /> : <span style={{ color: C.textDim, fontSize: 11 }}>{u.last_active ? new Date(u.last_active).toLocaleDateString() : "Never"}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Admin Actions</span>
          </div>
          <div style={{ padding: "8px 0" }}>
            {(activity?.recentAudit ?? []).length === 0 && <div style={{ padding: "24px 20px", color: C.textDim, fontSize: 13, textAlign: "center" }}>No recent actions</div>}
            {(activity?.recentAudit ?? []).slice(0, 10).map((a: AuditEntry) => (
              <div key={a.id} style={{ padding: "10px 20px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <Tag label={a.action || "ACTION"} color={ACTION_COLOR[a.action] || C.accent} />
                  <span style={{ color: C.textDim, fontSize: 10.5, fontFamily: "'Geist Mono', monospace", flexShrink: 0 }}>{new Date(a.created_at).toLocaleTimeString()}</span>
                </div>
                <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>
                  <span style={{ color: C.amber, fontWeight: 600 }}>{a.admin_name}</span>
                  <span style={{ color: C.textDim }}> → {a.target_type}</span>
                  {a.target_id && <span style={{ color: C.textDim, fontFamily: "'Geist Mono', monospace" }}> #{String(a.target_id).slice(0, 10)}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── USERS ────────────────────────────────────────────────────────────────────
const Users: FC<{ token: string }> = ({ token }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [subFilter, setSubFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [banModal, setBanModal] = useState<User | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banExpiry, setBanExpiry] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { show, ToastContainer } = useToast();
  

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), search, role: roleFilter, subscription: subFilter });
      const data = await adminFetch(`/users?${qs}`, token);
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch (e: unknown) { show(e instanceof Error ? e.message : "Failed to load users", "error"); }
    finally { setLoading(false); }
  }, [token, page, search, roleFilter, subFilter, show]);

  useEffect(() => { load(); }, [load]);

  const loadUserDetail = async (userId: string) => {
    setDetailLoading(true);
    setSelectedUserId(userId);
    try {
      const data = await adminFetch(`/users/${userId}`, token);
      setUserDetail(data);
    } catch { /* silent */ }
    finally { setDetailLoading(false); }
  };

  const handleBan = async () => {
    if (!banModal) return;
    try {
      await adminFetch(`/users/${banModal.id}/ban`, token, {
        method: "POST",
        body: JSON.stringify({ reason: banReason || null, expiresAt: banExpiry || null }),
      });
      show(`${banModal.name} has been banned`, "success");
      setBanModal(null); setBanReason(""); setBanExpiry(""); load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to ban user";
      show(msg, "error");
    }
  };

  const handleUnban = async (userId: string, name: string) => {
    try {
      await adminFetch(`/users/${userId}/unban`, token, { method: "POST" });
      show(`${name} has been unbanned`, "success"); load();
    } catch { show("Failed to unban user", "error"); }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`⚠️ Permanently delete ${name} and ALL their data? This cannot be undone.`)) return;
    try {
      await adminFetch(`/users/${userId}`, token, { method: "DELETE" });
      show(`${name} has been deleted`, "success");
      if (selectedUserId === userId) { setSelectedUserId(null); setUserDetail(null); }
      load();
    } catch { show("Failed to delete user", "error"); }
  };

  const handleUpdate = async (userId: string, updates: Partial<Pick<User, "role" | "subscription" | "name">>) => {
    try {
      await adminFetch(`/users/${userId}`, token, { method: "PUT", body: JSON.stringify(updates) });
      show("User updated", "success"); load();
    } catch { show("Failed to update user", "error"); }
  };

  return (
    <div className="fade-in" style={{ display: "grid", gridTemplateColumns: selectedUserId ? "1fr 380px" : "1fr", gap: 18 }}>
      {ToastContainer}
      <div>
        <SectionHeader title="User Management" subtitle={`${total.toLocaleString()} registered users`}
          actions={
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <SelectInput value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} style={{ width: "auto" }}>
                <option value="">All Roles</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </SelectInput>
              <SelectInput value={subFilter} onChange={e => { setSubFilter(e.target.value); setPage(1); }} style={{ width: "auto" }}>
                <option value="">All Plans</option>
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
              </SelectInput>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search users…"
                style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", width: 220 }} />
            </div>
          }
        />
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: C.surfaceHigh }}><Th>User</Th><Th>Role</Th><Th>Plan</Th><Th>Modules</Th><Th>Status</Th><Th>Last Active</Th><Th>Actions</Th></tr></thead>
              <tbody>
                {loading ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={7} />) :
                  users.length === 0 ? <tr><td colSpan={7}><Empty text="No users found" /></td></tr> :
                  users.map(u => (
                    <TableRow key={u.id} onClick={() => loadUserDetail(u.id)} highlight={selectedUserId === u.id}>
                      <Td>
                        <div style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>{u.name}</div>
                        <div style={{ color: C.textDim, fontSize: 11, marginTop: 1, fontFamily: "'Geist Mono', monospace" }}>{u.email}</div>
                      </Td>
                      <Td>
                        <SelectInput value={u.role} onChange={e => { e.stopPropagation(); handleUpdate(u.id, { role: e.target.value }); }} style={{ width: "auto" }}>
                          <option value="student">student</option>
                          <option value="teacher">teacher</option>
                        </SelectInput>
                      </Td>
                      <Td>
                        <SelectInput value={u.subscription} onChange={e => { e.stopPropagation(); handleUpdate(u.id, { subscription: e.target.value }); }} style={{ width: "auto" }}>
                          <option value="basic">basic</option>
                          <option value="premium">premium</option>
                        </SelectInput>
                      </Td>
                      <Td><Pill value={u.module_count} color={C.accent} /></Td>
                      <Td>
                        {u.is_banned ? <Tag label="Banned" color={C.red} dot /> :
                          u.is_online ? <Tag label="Online" color={C.green} dot /> :
                          <Tag label="Offline" color={C.textDim} />}
                      </Td>
                      <Td mono dim>{u.last_active ? new Date(u.last_active).toLocaleDateString() : "Never"}</Td>
                      <Td>
                        <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                          {u.is_banned
                            ? <Btn size="sm" variant="success" onClick={() => handleUnban(u.id, u.name)}>Unban</Btn>
                            : <Btn size="sm" variant="danger" onClick={() => setBanModal(u)}>Ban</Btn>}
                          <Btn size="sm" variant="ghost" onClick={() => handleDelete(u.id, u.name)}>Delete</Btn>
                        </div>
                      </Td>
                    </TableRow>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onChange={setPage} />
      </div>

      {selectedUserId && (
        <div className="slide-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>User Profile</span>
            <button onClick={() => { setSelectedUserId(null); setUserDetail(null); }} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>
          {detailLoading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12, marginBottom: 12 }} />) :
            userDetail && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Card style={{ padding: 18 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}30, ${C.purple}30)`, border: `1px solid ${C.accent}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                      {userDetail.user.role === "teacher" ? "👨‍🏫" : "🎓"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{userDetail.user.name}</div>
                      <div style={{ color: C.textDim, fontSize: 11.5, fontFamily: "'Geist Mono', monospace" }}>{userDetail.user.email}</div>
                    </div>
                  </div>
                  <Divider />
                  {([
                    ["User ID", String(userDetail.user.id).slice(0, 16) + "…", true],
                    ["Role", userDetail.user.role, false],
                    ["Plan", userDetail.user.subscription, false],
                    ["Status", userDetail.isBanned ? "Banned" : userDetail.user.is_online ? "Online" : "Offline", false],
                    ["Messages sent", String(userDetail.messageCount), true],
                    ["Joined", userDetail.user.created_at ? new Date(userDetail.user.created_at).toLocaleDateString() : "—", false],
                  ] as [string, string, boolean][]).map(([label, value, mono]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                      <span style={{ color: C.textMuted, fontSize: 12 }}>{label}</span>
                      <span style={{ color: C.text, fontSize: 12, fontFamily: mono ? "'Geist Mono', monospace" : "inherit", fontWeight: 500 }}>{value}</span>
                    </div>
                  ))}
                </Card>

                <Card style={{ padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 12 }}>Enrolled Modules ({userDetail.enrollments?.length ?? 0})</div>
                  {(userDetail.enrollments?.length ?? 0) === 0
                    ? <div style={{ color: C.textDim, fontSize: 12 }}>No modules</div>
                    : userDetail.enrollments?.map(m => (
                      <div key={m.code} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ color: C.text, fontSize: 12 }}>{m.name}</span>
                        <span style={{ color: C.textDim, fontSize: 11, fontFamily: "'Geist Mono', monospace" }}>{m.code}</span>
                      </div>
                    ))}
                </Card>

                <Card style={{ padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 12 }}>Recent Messages</div>
                  {(userDetail.recentMessages?.length ?? 0) === 0
                    ? <div style={{ color: C.textDim, fontSize: 12 }}>No messages</div>
                    : userDetail.recentMessages?.map(m => (
                      <div key={m._id} style={{ padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ color: C.textMuted, fontSize: 11.5, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.content ?? `[${m.type ?? "message"}]`}</div>
                        <div style={{ color: C.textDim, fontSize: 10.5, fontFamily: "'Geist Mono', monospace" }}>{new Date(m.timestamp).toLocaleString()}</div>
                      </div>
                    ))}
                </Card>

                {userDetail.isBanned && userDetail.banDetails && (
                  <div style={{ background: `${C.red}10`, border: `1px solid ${C.red}25`, borderLeft: `3px solid ${C.red}`, borderRadius: 10, padding: 14 }}>
                    <div style={{ color: C.red, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>⚠ Account Banned</div>
                    <div style={{ color: C.textMuted, fontSize: 12 }}>Reason: {userDetail.banDetails.reason ?? "No reason given"}</div>
                    {userDetail.banDetails.expires_at && <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>Expires: {new Date(userDetail.banDetails.expires_at).toLocaleString()}</div>}
                  </div>
                )}
              </div>
            )}
        </div>
      )}

      {banModal && (
        <Modal title={`Ban ${banModal.name}`} subtitle="This user will be immediately locked out." onClose={() => setBanModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", color: C.textMuted, fontSize: 11.5, fontWeight: 600, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.8 }}>Reason for ban</label>
              <Textarea value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Describe why this user is being banned…" rows={3} />
            </div>
            <div>
              <label style={{ display: "block", color: C.textMuted, fontSize: 11.5, fontWeight: 600, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.8 }}>Expiry date (blank = permanent)</label>
              <Input type="datetime-local" value={banExpiry} onChange={e => setBanExpiry(e.target.value)} />
            </div>
            <div style={{ background: `${C.amber}10`, border: `1px solid ${C.amber}25`, borderRadius: 9, padding: "10px 14px" }}>
              <span style={{ color: C.amber, fontSize: 12 }}>The user will be notified and immediately logged out from all sessions.</span>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => setBanModal(null)}>Cancel</Btn>
              <Btn variant="danger" onClick={handleBan}>Confirm Ban</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
const msgTypeColor = (type?: string): string => {
  if (type === "audio") return C.purple;
  if (type === "attachment") return C.amber;
  if (type === "image") return C.cyan;
  return C.accent;
};

const msgTypeInfo = (m: Message): { icon: string; color: string } => {
  if (m.deletedForEveryone) return { icon: "🗑", color: C.red };
  if (m.type === "audio") return { icon: "🎤", color: C.purple };
  if (m.type === "attachment") return { icon: "📎", color: C.amber };
  if (m.type === "image") return { icon: "🖼", color: C.cyan };
  return { icon: "💬", color: C.accent };
};

const Messages: FC<{ token: string }> = ({ token }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkUserModal, setBulkUserModal] = useState(false);
  const [bulkUserId, setBulkUserId] = useState("");
  const { show, ToastContainer } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), search, ...(typeFilter ? { type: typeFilter } : {}) });
      const data = await adminFetch(`/messages?${qs}`, token);
      setMessages(data.messages ?? []);
      setTotal(data.total ?? 0);
    } catch (e: unknown) { show(e instanceof Error ? e.message : "Failed to load", "error"); }
    finally { setLoading(false); }
  }, [token, page, search, typeFilter, show]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this message?")) return;
    try {
      await adminFetch(`/messages/${id}`, token, { method: "DELETE" });
      show("Message deleted", "success"); load();
    } catch { show("Failed to delete", "error"); }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`⚠️ DANGER: Permanently delete ALL ${total.toLocaleString()} messages in the database? This CANNOT be undone.`)) return;
    if (!confirm("Are you absolutely sure? This will wipe the entire message history.")) return;
    setBulkDeleting(true);
    try {
      await adminFetch("/messages/bulk/all", token, { method: "DELETE" });
      show("All messages deleted", "success"); load();
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Failed to delete all messages", "error");
    } finally { setBulkDeleting(false); }
  };

  const handleDeleteByUser = async () => {
    const uid = bulkUserId.trim();
    if (!uid) return;
    if (!confirm(`Permanently delete all messages from user ${uid}?`)) return;
    setBulkDeleting(true);
    try {
      await adminFetch(`/messages/bulk/user/${uid}`, token, { method: "DELETE" });
      show(`All messages from user deleted`, "success");
      setBulkUserModal(false); setBulkUserId(""); load();
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Failed to delete user messages", "error");
    } finally { setBulkDeleting(false); }
  };

  return (
    <div className="fade-in">
      {ToastContainer}
      <SectionHeader title="Message Management" subtitle={`${total.toLocaleString()} messages in database`}
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <SelectInput value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} style={{ width: "auto" }}>
              <option value="">All Types</option>
              <option value="text">Text</option>
              <option value="audio">Audio</option>
              <option value="attachment">Attachment</option>
            </SelectInput>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search content…"
              style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", width: 240 }} />
            <div style={{ width: 1, height: 28, background: C.border }} />
            <Btn size="sm" variant="amber" onClick={() => setBulkUserModal(true)} loading={bulkDeleting}>
              🗑 By User
            </Btn>
            <Btn size="sm" variant="danger" onClick={handleDeleteAll} loading={bulkDeleting}>
              ⚠ Delete All
            </Btn>
          </div>
        }
      />
      {/* Bulk delete by user modal */}
      {bulkUserModal && (
        <Modal title="Delete All Messages by User" subtitle="Permanently removes every message sent by this user" onClose={() => { setBulkUserModal(false); setBulkUserId(""); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", color: C.textMuted, fontSize: 11.5, fontWeight: 600, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.8 }}>User ID</label>
              <Input value={bulkUserId} onChange={e => setBulkUserId(e.target.value)} placeholder="Paste the full user UUID…" />
              <p style={{ color: C.textDim, fontSize: 11.5, marginTop: 6 }}>Find the User ID in the Users section by clicking on any user.</p>
            </div>
            <div style={{ background: `${C.red}10`, border: `1px solid ${C.red}25`, borderLeft: `3px solid ${C.red}`, borderRadius: 9, padding: "12px 14px" }}>
              <span style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>⚠ This will permanently delete all messages from that user and cannot be undone.</span>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => { setBulkUserModal(false); setBulkUserId(""); }}>Cancel</Btn>
              <Btn variant="danger" onClick={handleDeleteByUser} loading={bulkDeleting} disabled={!bulkUserId.trim()}>
                Delete All Their Messages
              </Btn>
            </div>
          </div>
        </Modal>
      )}
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.surfaceHigh }}>
                <Th w="30px" />
                <Th>Sender</Th>
                <Th>Content</Th>
                <Th>Type</Th>
                <Th>Room</Th>
                <Th>Timestamp</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} cols={8} />) :
                messages.length === 0 ? <tr><td colSpan={8}><Empty icon="💬" text="No messages found" /></td></tr> :
                messages.flatMap(m => {
                  const { icon, color } = msgTypeInfo(m);
                  const isEx = expanded === m._id;
                  const rows = [
                    <TableRow key={m._id} onClick={() => setExpanded(isEx ? null : m._id)}>
                      <Td>
                        <span style={{ color: C.textDim, fontSize: 11, display: "inline-block", transition: "transform 0.15s", transform: isEx ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
                      </Td>
                      <Td><span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: C.textMuted }}>{String(m.senderId).slice(0, 12)}</span></Td>
                      <Td mw="320px">
                        {m.deletedForEveryone
                          ? <span style={{ color: C.red, fontStyle: "italic", fontSize: 12 }}>Message deleted</span>
                          : m.type && m.type !== "text"
                            ? <span style={{ color }}>{icon} {m.type}{m.content ? `: ${m.content.slice(0, 60)}` : ""}</span>
                            : <span style={{ color: C.textMuted, fontSize: 12.5 }}>{m.content ? (m.content.length > 80 ? m.content.slice(0, 80) + "…" : m.content) : "—"}</span>}
                      </Td>
                      <Td><Tag label={m.type ?? "text"} color={msgTypeColor(m.type)} /></Td>
                      <Td mono dim>{String(m.roomId ?? "").slice(0, 14)}</Td>
                      <Td mono dim>{new Date(m.timestamp).toLocaleString()}</Td>
                      <Td><Tag label={m.status ?? "sent"} color={m.status === "read" ? C.green : m.status === "delivered" ? C.accent : C.textDim} /></Td>
                      <Td><div onClick={e => e.stopPropagation()}><Btn size="sm" variant="danger" onClick={() => handleDelete(m._id)}>Delete</Btn></div></Td>
                    </TableRow>,
                  ];
                  if (isEx) {
                    rows.push(
                      <tr key={`${m._id}-exp`}>
                        <td colSpan={8} style={{ padding: 0 }}>
                          <div style={{ background: C.surfaceHigh, borderBottom: `1px solid ${C.border}`, padding: "18px 24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: m.content ? 16 : 0 }}>
                              {([
                                ["Message ID", m._id, true],
                                ["Sender ID", String(m.senderId), true],
                                ["Room ID", String(m.roomId), true],
                                ["Timestamp", new Date(m.timestamp).toLocaleString(), false],
                                ["Type", m.type ?? "text", false],
                                ["Status", m.status ?? "sent", false],
                                ["Read by", String(m.readBy?.length ?? 0), true],
                                ["Deleted", m.deletedForEveryone ? "Yes" : "No", false],
                                ["Reactions", String(m.reactions?.length ?? 0), true],
                              ] as [string, string, boolean][]).map(([label, value, mono]) => (
                                <div key={label}>
                                  <div style={{ color: C.textDim, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
                                  <div style={{ color: C.text, fontSize: 12.5, fontFamily: mono ? "'Geist Mono', monospace" : "inherit", wordBreak: "break-all" }}>{value}</div>
                                </div>
                              ))}
                            </div>
                            {m.content && !m.deletedForEveryone && (
                              <div>
                                <div style={{ color: C.textDim, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Full content</div>
                                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: 14, color: C.text, fontSize: 13.5, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 240, overflowY: "auto" }}>{m.content}</div>
                              </div>
                            )}
                            {m.attachmentUrl && (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ color: C.textDim, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Attachment URL</div>
                                <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontSize: 12, fontFamily: "'Geist Mono', monospace", wordBreak: "break-all" }}>{m.attachmentUrl}</a>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return rows;
                })}
            </tbody>
          </table>
        </div>
      </Card>
      <Pagination page={page} totalPages={Math.ceil(total / 20)} onChange={setPage} />
    </div>
  );
};

// ─── MODULES ──────────────────────────────────────────────────────────────────
const Modules: FC<{ token: string }> = ({ token }) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Module | null>(null);
  const [enrollments, setEnrollments] = useState<User[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const { show, ToastContainer } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try { setModules(await adminFetch("/modules", token) ?? []); }
      catch { /* silent */ }
      finally { setLoading(false); }
    };
    load();
  }, [token]);

  const loadEnrollments = async (mod: Module) => {
    setSelected(mod); setEnrollLoading(true);
    try { setEnrollments(await adminFetch(`/modules/${mod.id}/enrollments`, token) ?? []); }
    catch { /* silent */ }
    finally { setEnrollLoading(false); }
  };

  const handleRemove = async (userId: string, moduleId: string) => {
    if (!confirm("Remove this user from the module?")) return;
    try {
      await adminFetch("/enrollments", token, { method: "DELETE", body: JSON.stringify({ userId, moduleId }) });
      show("Enrollment removed", "success");
      if (selected) loadEnrollments(selected);
    } catch { show("Failed to remove enrollment", "error"); }
  };

  return (
    <div className="fade-in">
      {ToastContainer}
      <SectionHeader title="Module Management" subtitle={`${modules.length} modules configured`} />
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1.3fr" : "1fr", gap: 18 }}>
        <Card>
          {loading ? <div style={{ padding: 24 }}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8, borderRadius: 8 }} />)}</div> : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: C.surfaceHigh }}><Th>Module Name</Th><Th>Code</Th><Th>Enrolled</Th><Th /></tr></thead>
              <tbody>
                {modules.length === 0 ? <tr><td colSpan={4}><Empty icon="📚" text="No modules" /></td></tr> :
                  modules.map(m => (
                    <TableRow key={m.id} onClick={() => loadEnrollments(m)} highlight={selected?.id === m.id}>
                      <Td><span style={{ fontWeight: 600, color: selected?.id === m.id ? C.accent : C.text }}>{m.name}</span></Td>
                      <Td mono dim>{m.code}</Td>
                      <Td><Pill value={m.user_count} color={C.accent} /></Td>
                      <Td><span style={{ color: C.textDim, fontSize: 11 }}>›</span></Td>
                    </TableRow>
                  ))}
              </tbody>
            </table>
          )}
        </Card>

        {selected && (
          <div className="slide-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{selected.name}</div>
                <div style={{ color: C.textMuted, fontSize: 12, marginTop: 3 }}>{enrollments.length} enrolled users</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <Card>
              {enrollLoading ? <div style={{ padding: 24 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 8 }} />)}</div> : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: C.surfaceHigh }}><Th>Student</Th><Th>Role</Th><Th>Plan</Th><Th></Th></tr></thead>
                  <tbody>
                    {enrollments.length === 0 ? <tr><td colSpan={4}><Empty icon="👥" text="No enrollments" /></td></tr> :
                      enrollments.map(u => (
                        <TableRow key={u.id}>
                          <Td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                            <div style={{ color: C.textDim, fontSize: 11, fontFamily: "'Geist Mono', monospace" }}>{u.email}</div>
                          </Td>
                          <Td><Tag label={u.role} color={u.role === "teacher" ? C.amber : C.accent} /></Td>
                          <Td><Tag label={u.subscription} color={u.subscription === "premium" ? C.green : C.textDim} /></Td>
                          <Td><Btn size="sm" variant="danger" onClick={() => handleRemove(u.id, selected.id)}>Remove</Btn></Td>
                        </TableRow>
                      ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
const CHART_COLORS = [C.accent, C.green, C.amber, C.red, C.purple, C.cyan];

interface ChartPayloadItem { value: number | string; name: string; color?: string; }
interface CustomTooltipProps { active?: boolean; payload?: ChartPayloadItem[]; label?: string; }
const CustomTooltip: FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 10, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
      <p style={{ color: C.textMuted, fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? C.text, fontSize: 14, fontWeight: 700, fontFamily: "'Geist Mono', monospace" }}>
          {typeof p.value === "number" ? p.value.toLocaleString() : p.value} <span style={{ color: C.textMuted, fontWeight: 400, fontSize: 12 }}>{p.name}</span>
        </p>
      ))}
    </div>
  );
};

const Analytics: FC<{ token: string }> = ({ token }) => {
  const [msgData, setMsgData] = useState<Array<{ date: string; messages: number }>>([]);
  const [userData, setUserData] = useState<{ roles: any[]; subscriptions: any[]; activeToday: number; activeWeek: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [m, u] = await Promise.all([adminFetch("/analytics/messages", token), adminFetch("/analytics/users", token)]);
        setMsgData(m ?? []); setUserData(u);
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    load();
  }, [token]);

  if (loading) return <div style={{ display: "grid", gap: 16 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />)}</div>;

  return (
    <div className="fade-in">
      <SectionHeader title="Analytics" subtitle="Platform usage and trends" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 22 }}>
        <StatCard label="Active Today" value={userData?.activeToday} icon="⚡" color={C.cyan} />
        <StatCard label="Active This Week" value={userData?.activeWeek} icon="📈" color={C.purple} />
      </div>
      <Card style={{ padding: 24, marginBottom: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 20 }}>Message Volume — Last 7 Days</div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={msgData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.accent} stopOpacity={0.25} />
                <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fill: C.textDim, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.textDim, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="messages" stroke={C.accent} strokeWidth={2} fill="url(#msgGrad)" dot={{ fill: C.accent, strokeWidth: 0, r: 3 }} activeDot={{ r: 5, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 20 }}>User Roles</div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <PieChart width={160} height={160}>
              <Pie data={userData?.roles ?? []} dataKey="count" nameKey="role" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                {(userData?.roles ?? []).map((_: unknown, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 8 }} />
            </PieChart>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {(userData?.roles ?? []).map((r: { role: string; count: number }, i: number) => (
                <div key={r.role} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span style={{ color: C.textMuted, fontSize: 12, textTransform: "capitalize" }}>{r.role}</span>
                  </div>
                  <span style={{ color: C.text, fontSize: 13, fontWeight: 700, fontFamily: "'Geist Mono', monospace" }}>{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 20 }}>Subscription Plans</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={(userData?.subscriptions ?? []).map((s: { subscription: string; count: string | number }) => ({ name: s.subscription, count: parseInt(String(s.count)) }))} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: C.textDim, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textDim, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 8 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {(userData?.subscriptions ?? []).map((_: unknown, i: number) => <Cell key={i} fill={i === 0 ? C.green : C.accent} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

// ─── SYSTEM ───────────────────────────────────────────────────────────────────
const System: FC<{ token: string }> = ({ token }) => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mModal, setMModal] = useState(false);
  const [mMsg, setMMsg] = useState("");
  const [mEnd, setMEnd] = useState("");
  const [toggling, setToggling] = useState(false);
  const { show, ToastContainer } = useToast();

  const load = useCallback(async () => {
    try { setHealth(await adminFetch("/system/health", token)); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); const iv = setInterval(load, 10000); return () => clearInterval(iv); }, [load]);

  const toggleMaintenance = async (enabled: boolean) => {
    setToggling(true);
    try {
      await adminFetch("/system/maintenance", token, { method: "POST", body: JSON.stringify({ enabled, message: mMsg, endDate: mEnd || null }) });
      show(`Maintenance mode ${enabled ? "enabled" : "disabled"}`, enabled ? "warning" : "success");
      setMModal(false); load();
    } catch { show("Failed to toggle maintenance mode", "error"); }
    finally { setToggling(false); }
  };

  const fmtBytes = (b: number): string => {
    if (!b) return "0 B";
    if (b > 1024 ** 3) return `${(b / 1024 ** 3).toFixed(2)} GB`;
    if (b > 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`;
    return `${(b / 1024).toFixed(1)} KB`;
  };
  const fmtUptime = (s = 0): string => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${Math.floor(s % 60)}s`;

  const isHealthy = health?.status === "healthy";
  const isMaintenance = health?.maintenanceMode;

  interface MetricRowProps { label: string; value?: string | number; color?: string; mono?: boolean; }
  const MetricRow: FC<MetricRowProps> = ({ label, value, color, mono }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ color: C.textMuted, fontSize: 12.5 }}>{label}</span>
      <span style={{ color: color ?? C.text, fontSize: 12.5, fontFamily: mono ? "'Geist Mono', monospace" : "inherit", fontWeight: 500 }}>{value ?? "—"}</span>
    </div>
  );

  return (
    <div className="fade-in">
      {ToastContainer}
      <SectionHeader title="System Controls" subtitle="Infrastructure health and platform settings" live
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: isHealthy ? C.green : C.red, boxShadow: `0 0 10px ${isHealthy ? C.green : C.red}`, animation: "pulse-dot 2s infinite" }} />
            <span style={{ color: isHealthy ? C.green : C.red, fontWeight: 700, fontSize: 12, letterSpacing: 0.5 }}>
              {isHealthy ? "ALL SYSTEMS OPERATIONAL" : "ISSUES DETECTED"}
            </span>
          </div>
        }
      />

      {isMaintenance && (
        <div style={{ background: `${C.amber}12`, border: `1px solid ${C.amber}30`, borderLeft: `4px solid ${C.amber}`, borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 24 }}>🔧</span>
            <div>
              <div style={{ color: C.amber, fontWeight: 800, fontSize: 14 }}>MAINTENANCE MODE ACTIVE</div>
              <div style={{ color: C.textMuted, fontSize: 12, marginTop: 3 }}>All users are currently seeing the maintenance page</div>
            </div>
          </div>
          <Btn variant="success" onClick={() => toggleMaintenance(false)} loading={toggling}>✓ Disable Maintenance</Btn>
        </div>
      )}

      {loading ? (
        <div style={{ display: "grid", gap: 14 }}>{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 14 }} />)}</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
            <StatCard label="Online Users" value={health?.stats.onlineUsers} icon="🟢" color={C.green} />
            <StatCard label="Total Users" value={health?.stats.totalUsers.toLocaleString()} icon="👥" color={C.accent} />
            <StatCard label="Total Messages" value={health?.stats.totalMessages.toLocaleString()} icon="💬" color={C.purple} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Card style={{ padding: 22 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 14, display: "flex", gap: 8, alignItems: "center" }}>
                🗄 Database <Tag label={health?.database.status ?? "—"} color={C.green} dot />
              </div>
              <MetricRow label="PostgreSQL" value={health?.database.status} color={C.green} />
              <MetricRow label="PG Latency" value={health?.database.latency} color={parseFloat(health?.database.latency ?? "999") < 50 ? C.green : C.amber} mono />
              <MetricRow label="MongoDB" value={health?.mongodb.status} color={C.green} />
              <MetricRow label="Mongo Latency" value={health?.mongodb.latency} color={parseFloat(health?.mongodb.latency ?? "999") < 50 ? C.green : C.amber} mono />
            </Card>
            <Card style={{ padding: 22 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 14, display: "flex", gap: 8, alignItems: "center" }}>
                ⚙️ Server <Tag label={health?.environment ?? "production"} color={C.accent} />
              </div>
              <MetricRow label="Uptime" value={fmtUptime(health?.uptime)} mono />
              <MetricRow label="Heap Used" value={fmtBytes(health?.memory.heapUsed ?? 0)} mono />
              <MetricRow label="RSS Memory" value={fmtBytes(health?.memory.rss ?? 0)} mono />
              <MetricRow label="Node.js" value={health?.nodeVersion} color={C.green} mono />
              <MetricRow label="Heap Total" value={fmtBytes(health?.memory.heapTotal ?? 0)} mono />
            </Card>
          </div>
          {!isMaintenance && (
            <Card style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>⚠️</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Maintenance Mode</span>
                  </div>
                  <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.5, maxWidth: 500 }}>Enabling maintenance mode will immediately show a maintenance page to all users. You can set a custom message and estimated return time.</p>
                </div>
                <Btn variant="danger" size="lg" onClick={() => setMModal(true)}>Enable Maintenance</Btn>
              </div>
            </Card>
          )}
        </>
      )}

      {mModal && (
        <Modal title="Enable Maintenance Mode" subtitle="Users will be redirected immediately" onClose={() => setMModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", color: C.textMuted, fontSize: 11.5, fontWeight: 600, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.8 }}>Message to users</label>
              <Textarea value={mMsg} onChange={e => setMMsg(e.target.value)} placeholder="We're performing scheduled maintenance. We'll be back shortly!" rows={3} />
            </div>
            <div>
              <label style={{ display: "block", color: C.textMuted, fontSize: 11.5, fontWeight: 600, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.8 }}>Estimated end time (optional)</label>
              <Input type="datetime-local" value={mEnd} onChange={e => setMEnd(e.target.value)} />
            </div>
            <div style={{ background: `${C.red}10`, border: `1px solid ${C.red}25`, borderLeft: `3px solid ${C.red}`, borderRadius: 9, padding: "12px 14px" }}>
              <span style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>⚠ Warning: </span>
              <span style={{ color: C.textMuted, fontSize: 13 }}>All users will see the maintenance page immediately. Ensure you have a rollback plan.</span>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => setMModal(false)}>Cancel</Btn>
              <Btn variant="danger" onClick={() => toggleMaintenance(true)} loading={toggling}>Confirm — Enable Now</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────
const AuditLog: FC<{ token: string }> = ({ token }) => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: "50" });
      const data = await adminFetch(`/audit?${qs}`, token);
      setLogs(data.logs ?? []); setTotal(data.total ?? 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [token, page]);

  useEffect(() => { load(); }, [load]);

  const AUDIT_ACTION_COLOR: Record<string, string> = {
    DELETE_USER: C.red, DELETE_MESSAGE: C.red,
    BAN_USER: C.amber, UNBAN_USER: C.green,
    UPDATE_USER: C.accent, REMOVE_ENROLLMENT: C.purple,
    ENABLE_MAINTENANCE: C.red, DISABLE_MAINTENANCE: C.green,
    LOGIN: C.cyan,
  };

  const uniqueActions = [...new Set(logs.map(l => l.action).filter(Boolean))];

  const filteredLogs = logs.filter(l => {
    const matchSearch = !search ||
      l.action?.includes(search.toUpperCase()) ||
      l.admin_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.target_id?.includes(search);
    const matchAction = !actionFilter || l.action === actionFilter;
    return matchSearch && matchAction;
  });

  return (
    <div className="fade-in">
      <SectionHeader title="Audit Log" subtitle={`${total.toLocaleString()} total events — complete admin history`}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <SelectInput value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={{ width: "auto", minWidth: 160 }}>
              <option value="">All Actions</option>
              {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
            </SelectInput>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs…"
              style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none", width: 220 }} />
          </div>
        }
      />
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.surfaceHigh }}>
                <Th w="30px" />
                <Th>Timestamp</Th>
                <Th>Admin</Th>
                <Th>Action</Th>
                <Th>Target Type</Th>
                <Th>Target ID</Th>
                <Th>Details</Th>
                <Th>IP Address</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} cols={8} />) :
                filteredLogs.length === 0 ? <tr><td colSpan={8}><Empty icon="🔍" text="No audit events found" /></td></tr> :
                filteredLogs.flatMap(l => {
                  const isEx = expanded === l.id;
                  let parsedDetails: Record<string, unknown> = {};
                  try { parsedDetails = l.details ? JSON.parse(l.details) : {}; } catch { /* skip */ }
                  const hasDetails = Object.keys(parsedDetails).length > 0;
                  return [
                    <TableRow key={l.id} onClick={() => hasDetails && setExpanded(isEx ? null : l.id)}>
                      <Td>
                        {hasDetails && <span style={{ color: C.textDim, fontSize: 11, display: "inline-block", transition: "transform 0.15s", transform: isEx ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>}
                      </Td>
                      <Td mono dim>{new Date(l.created_at).toLocaleString()}</Td>
                      <Td><span style={{ color: C.amber, fontWeight: 600, fontSize: 13 }}>{l.admin_name ?? "System"}</span></Td>
                      <Td><Tag label={l.action ?? "UNKNOWN"} color={AUDIT_ACTION_COLOR[l.action] ?? C.accent} /></Td>
                      <Td><span style={{ color: C.textMuted, fontSize: 12, fontFamily: "'Geist Mono', monospace" }}>{l.target_type}</span></Td>
                      <Td mono dim>{l.target_id ? String(l.target_id).slice(0, 16) + (String(l.target_id).length > 16 ? "…" : "") : "—"}</Td>
                      <Td>
                        {hasDetails
                          ? <span style={{ color: C.textDim, fontSize: 11.5, fontFamily: "'Geist Mono', monospace", cursor: "pointer" }}>{JSON.stringify(parsedDetails).slice(0, 45)}…</span>
                          : <span style={{ color: C.textDim }}>—</span>}
                      </Td>
                      <Td mono dim>{l.ip_address ?? "—"}</Td>
                    </TableRow>,
                    ...(isEx && hasDetails ? [
                      <tr key={`${l.id}-exp`}>
                        <td colSpan={8}>
                          <div style={{ background: C.surfaceHigh, padding: "14px 24px 14px 48px", borderBottom: `1px solid ${C.border}` }}>
                            <div style={{ fontWeight: 600, fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Event Details</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                              {Object.entries(parsedDetails).map(([k, v]) => (
                                <div key={k}>
                                  <div style={{ color: C.textDim, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{k}</div>
                                  <div style={{ color: C.text, fontSize: 12.5, fontFamily: "'Geist Mono', monospace", wordBreak: "break-all" }}>
                                    {v === null || v === undefined ? "null" : typeof v === "object" ? JSON.stringify(v) : String(v) || "—"}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>,
                    ] : []),
                  ];
                })}
            </tbody>
          </table>
        </div>
      </Card>
      <Pagination page={page} totalPages={Math.ceil(total / 50)} onChange={setPage} />
    </div>
  );
};

// ─── NAV CONFIG ───────────────────────────────────────────────────────────────
const NAV: Array<{ id: Section; label: string; icon: string }> = [
  { id: "dashboard", label: "Dashboard", icon: "⚡" },
  { id: "users", label: "Users", icon: "👥" },
  { id: "messages", label: "Messages", icon: "💬" },
  { id: "modules", label: "Modules", icon: "📚" },
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "system", label: "System", icon: "⚙️" },
  { id: "audit", label: "Audit Log", icon: "🛡" },
];

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const token = localStorage.getItem("admin_token");
      const raw = localStorage.getItem("admin_user");
      return { token, admin: raw ? JSON.parse(raw) : null };
    } catch { return { token: null, admin: null }; }
  });
  const [section, setSection] = useState<Section>("dashboard");

  const handleLogin = (token: string, admin: { email: string; name: string }) => {
    localStorage.setItem("admin_token", token);
    localStorage.setItem("admin_user", JSON.stringify(admin));
    setAuth({ token, admin });
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setAuth({ token: null, admin: null });
  };

  if (!auth.token) return <><GlobalStyles /><LoginPage onLogin={handleLogin} /></>;

  return (
    <>
      <GlobalStyles />
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex" }}>
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: `radial-gradient(ellipse 1200px 800px at -10% 30%, rgba(79,142,247,0.04) 0%, transparent 65%), radial-gradient(ellipse 800px 600px at 110% 80%, rgba(34,211,160,0.03) 0%, transparent 65%)` }} />

        {/* Sidebar */}
        <aside style={{ width: 228, background: `${C.surface}CC`, backdropFilter: "blur(20px)", borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100 }}>
          <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.accent}, ${C.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>⚡</div>
              <div>
                <div style={{ color: C.text, fontWeight: 800, fontSize: 16, letterSpacing: -0.5 }}>ChezaX</div>
                <div style={{ color: C.textDim, fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginTop: 1 }}>Control Tower</div>
              </div>
            </div>
          </div>
          <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
            <div style={{ color: C.textDim, fontSize: 9.5, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", padding: "8px 10px 6px", marginBottom: 2 }}>Navigation</div>
            {NAV.map(n => {
              const active = section === n.id;
              return (
                <button key={n.id} onClick={() => setSection(n.id)} className="nav-item"
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, border: "none", background: active ? `${C.accent}14` : "transparent", color: active ? C.accent : C.textMuted, cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500, marginBottom: 2, textAlign: "left", letterSpacing: 0.1 }}>
                  <span style={{ fontSize: 15, opacity: active ? 1 : 0.7 }}>{n.icon}</span>
                  {n.label}
                  {active && <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: C.accent, boxShadow: `0 0 6px ${C.accent}` }} />}
                </button>
              );
            })}
          </nav>
          <div style={{ padding: "14px 16px", borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${C.accent}25, ${C.purple}25)`, border: `1px solid ${C.accent}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>👤</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.text, fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{auth.admin?.name ?? "Admin"}</div>
                <div style={{ color: C.textDim, fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{auth.admin?.email}</div>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-hover"
              style={{ width: "100%", background: `${C.red}12`, border: `1px solid ${C.red}20`, borderRadius: 8, padding: "7px 12px", color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: 0.2 }}>
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ marginLeft: 228, flex: 1, padding: "32px 36px", minHeight: "100vh", position: "relative" }}>
          {section === "dashboard" && <Dashboard token={auth.token!} />}
          {section === "users"     && <Users     token={auth.token!} />}
          {section === "messages"  && <Messages  token={auth.token!} />}
          {section === "modules"   && <Modules   token={auth.token!} />}
          {section === "analytics" && <Analytics token={auth.token!} />}
          {section === "system"    && <System    token={auth.token!} />}
          {section === "audit"     && <AuditLog  token={auth.token!} />}
        </main>
      </div>
    </>
  );
}