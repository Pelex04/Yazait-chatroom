import { useState, useEffect } from "react";

interface Module {
  id: string;
  name: string;
  code: string;
  participantCount?: number;
  lastActivity?: string;
  instructorName?: string;
  unreadCount?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  subscription: string;
}

interface ModuleSelectorProps {
  user: User;
  modules: Module[];
  onSelectModule: (module: Module) => void;
  onLogout: () => void;
  isLoading?: boolean;
}

const COLORS = [
  { bg: "#EFF6FF", text: "#1D4ED8", dot: "#3B82F6" },
  { bg: "#F5F3FF", text: "#6D28D9", dot: "#8B5CF6" },
  { bg: "#ECFDF5", text: "#065F46", dot: "#10B981" },
  { bg: "#FFF7ED", text: "#9A3412", dot: "#F97316" },
  { bg: "#FFF1F2", text: "#9F1239", dot: "#F43F5E" },
  { bg: "#F0FDFA", text: "#115E59", dot: "#14B8A6" },
  { bg: "#FFFBEB", text: "#92400E", dot: "#F59E0B" },
  { bg: "#F0FDF4", text: "#14532D", dot: "#22C55E" },
];

function getColor(i: number) {
  return COLORS[i % COLORS.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function UserAvatar({ user }: { user: User }) {
  const [err, setErr] = useState(false);
  const isUrl = user.avatar?.startsWith("http");
  if (isUrl && !err) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        onError={() => setErr(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: "50%",
        }}
      />
    );
  }
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: "#fff",
        letterSpacing: -0.3,
      }}
    >
      {initials(user.name)}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: "#fff",
        border: "1px solid #F3F4F6",
        borderRadius: 12,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          flexShrink: 0,
          background:
            "linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%)",
          backgroundSize: "300px 100%",
          animation: "shimmer 1.5s ease-in-out infinite",
        }}
      />
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}
      >
        <div
          style={{
            height: 11,
            width: "62%",
            borderRadius: 5,
            background:
              "linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%)",
            backgroundSize: "300px 100%",
            animation: "shimmer 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            height: 9,
            width: "38%",
            borderRadius: 5,
            background:
              "linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%)",
            backgroundSize: "300px 100%",
            animation: "shimmer 1.5s ease-in-out infinite 0.15s",
          }}
        />
      </div>
    </div>
  );
}

function ModuleCard({
  module,
  index,
  onClick,
  visible,
}: {
  module: Module;
  index: number;
  onClick: () => void;
  visible: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const color = getColor(index);
  const ini = initials(module.name);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: hovered ? "#FAFAFA" : "#fff",
        border: `1px solid ${hovered ? "#E5E7EB" : "#F3F4F6"}`,
        borderRadius: 12,
        cursor: "pointer",
        textAlign: "left",
        boxShadow: hovered
          ? "0 4px 12px rgba(0,0,0,0.07)"
          : "0 1px 2px rgba(0,0,0,0.04)",
        transform: visible
          ? hovered
            ? "translateY(-1px)"
            : "translateY(0)"
          : "translateY(10px)",
        opacity: visible ? 1 : 0,
        transition: visible ? `all 200ms cubic-bezier(0.4,0,0.2,1)` : "none",
        transitionDelay: visible ? `${index * 45}ms` : "0ms",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Yellow accent line on hover */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "15%",
          bottom: "15%",
          width: 3,
          borderRadius: "0 3px 3px 0",
          background: "#FACC15",
          opacity: hovered ? 1 : 0,
          transition: "opacity 180ms ease",
        }}
      />

      {/* Icon */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          flexShrink: 0,
          background: color.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          color: color.text,
          letterSpacing: -0.4,
          fontFamily: "Inter, system-ui, sans-serif",
          transition: "transform 180ms ease",
          transform: hovered ? "scale(1.06)" : "scale(1)",
          border: `1px solid ${color.dot}20`,
        }}
      >
        {ini}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: "#111827",
            letterSpacing: -0.2,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: 3,
          }}
        >
          {module.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: color.text,
              background: color.bg,
              padding: "1.5px 7px",
              borderRadius: 100,
              border: `1px solid ${color.dot}25`,
              fontFamily: "monospace",
              letterSpacing: 0.3,
            }}
          >
            {module.code}
          </span>
          {module.participantCount !== undefined && (
            <span style={{ fontSize: 10.5, color: "#9CA3AF" }}>
              {module.participantCount} members
            </span>
          )}
        </div>
      </div>

      {/* Right */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 5,
          flexShrink: 0,
        }}
      >
        {module.unreadCount ? (
          <span
            style={{
              minWidth: 20,
              height: 20,
              borderRadius: 100,
              background: "#FACC15",
              color: "#1A1714",
              fontSize: 9.5,
              fontWeight: 700,
              fontFamily: "monospace",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 5px",
              boxShadow: "0 2px 6px rgba(250,204,21,0.4)",
            }}
          >
            {module.unreadCount > 99 ? "99+" : module.unreadCount}
          </span>
        ) : (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke={hovered ? "#6B7280" : "#D1D5DB"}
            strokeWidth="2.5"
            style={{
              transition: `stroke 180ms ease, transform 180ms ease`,
              transform: hovered ? "translateX(2px)" : "none",
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
        {module.lastActivity && (
          <span
            style={{ fontSize: 10, color: "#D1D5DB", fontFamily: "monospace" }}
          >
            {timeAgo(module.lastActivity)}
          </span>
        )}
      </div>
    </button>
  );
}

export default function ModuleSelector({
  user,
  modules,
  onSelectModule,
  onLogout,
  isLoading = false,
}: ModuleSelectorProps) {
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setVisible(true);
      setTimeout(() => setCardsVisible(true), 100);
    });
  }, []);

  const filtered = modules.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase()) ||
      (m.instructorName || "").toLowerCase().includes(search.toLowerCase()),
  );

  const firstName = user.name.split(" ")[0];
  const totalUnread = modules.reduce((s, m) => s + (m.unreadCount || 0), 0);

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -300px 0; }
          100% { background-position: 300px 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes sheetUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: Inter, system-ui, "Segoe UI", Roboto, sans-serif;
          background: #fff;
          color: #111827;
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }

        .ms-page {
          min-height: 100vh;
          background: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .ms-wrap {
          width: 100%;
          max-width: 480px;
          padding: 0 20px 56px;
          flex: 1;
        }

        /* ── Top bar ── */
        .ms-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 22px 0 0;
          opacity: 0; transform: translateY(-10px);
          transition: opacity 380ms ease, transform 380ms ease;
        }
        .ms-topbar.in { opacity: 1; transform: translateY(0); }

        .ms-brand { display: flex; align-items: center; gap: 8px; }
        .ms-brand-slug {
          background: #1E293B; color: #fff;
          padding: 5px 11px; border-radius: 7px;
          font-size: 13px; font-weight: 700; letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .ms-brand-slug span { color: #FACC15; }

        .ms-topbar-right { display: flex; align-items: center; gap: 8px; }

        .ms-icon-btn {
          width: 36px; height: 36px;
          border: 1px solid #E5E7EB;
          background: #fff;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #9CA3AF;
          transition: all 150ms ease;
          position: relative; padding: 0;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .ms-icon-btn:hover { border-color: #D1D5DB; color: #374151; }

        .ms-avatar-btn {
          width: 36px; height: 36px; border-radius: 50%;
          overflow: hidden; border: 1.5px solid #E5E7EB;
          background: #1E293B;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; padding: 0;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
          transition: border-color 150ms ease;
        }
        .ms-avatar-btn:hover { border-color: #9CA3AF; }

        .ms-notif-dot {
          position: absolute; top: 7px; right: 7px;
          width: 7px; height: 7px;
          background: #FACC15; border-radius: 50%;
          border: 1.5px solid #fff;
        }

        /* ── Hero ── */
        .ms-hero {
          padding: 30px 0 24px;
          opacity: 0; transform: translateY(-5px);
          transition: opacity 380ms ease 70ms, transform 380ms ease 70ms;
        }
        .ms-hero.in { opacity: 1; transform: translateY(0); }

        .ms-greeting { font-size: 12.5px; color: #9CA3AF; margin-bottom: 3px; }
        .ms-name {
          font-size: 26px; font-weight: 700; color: #111827;
          letter-spacing: -0.6px; line-height: 1.15; margin-bottom: 10px;
        }
        .ms-badges { display: flex; gap: 5px; align-items: center; }
        .ms-badge {
          font-size: 10.5px; font-weight: 500;
          padding: 2.5px 9px; border-radius: 100px;
          letter-spacing: 0.1px; text-transform: capitalize;
        }
        .ms-badge-role { background: #F3F4F6; color: #6B7280; border: 1px solid #E5E7EB; }
        .ms-badge-premium { background: #FEF9C3; color: #92400E; border: 1px solid #FDE68A; }
        .ms-badge-basic { background: #F3F4F6; color: #9CA3AF; border: 1px solid #E5E7EB; }

        /* ── Divider ── */
        .ms-rule {
          height: 1px; background: #F3F4F6; margin-bottom: 20px;
          opacity: 0; transition: opacity 380ms ease 130ms;
        }
        .ms-rule.in { opacity: 1; }

        /* ── Section head ── */
        .ms-sec-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
          opacity: 0; transition: opacity 380ms ease 145ms;
        }
        .ms-sec-head.in { opacity: 1; }
        .ms-sec-label {
          font-size: 10.5px; font-weight: 600; color: #9CA3AF;
          letter-spacing: 0.7px; text-transform: uppercase;
        }
        .ms-sec-count {
          font-size: 10.5px; color: #9CA3AF;
          background: #F9FAFB; border: 1px solid #F3F4F6;
          padding: 2px 8px; border-radius: 100px;
        }

        /* ── Search ── */
        .ms-search-wrap {
          margin-bottom: 10px;
          opacity: 0; transition: opacity 380ms ease 125ms;
          position: relative;
        }
        .ms-search-wrap.in { opacity: 1; }
        .ms-search-icon {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%); color: #9CA3AF; pointer-events: none;
        }
        .ms-search {
          width: 100%; height: 38px;
          border: 1px solid #E5E7EB; border-radius: 8px;
          background: #FAFAFA;
          padding: 0 12px 0 36px;
          font-size: 13px; color: #374151;
          font-family: inherit; outline: none;
          transition: all 170ms ease;
        }
        .ms-search::placeholder { color: #C4C9D4; }
        .ms-search:focus {
          border-color: #FDE68A;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(250,204,21,0.12);
        }

        /* ── Module list ── */
        .ms-list { display: flex; flex-direction: column; gap: 6px; }

        /* ── Empty ── */
        .ms-empty { padding: 44px 0; text-align: center; }
        .ms-empty-icon {
          width: 52px; height: 52px;
          background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 14px; font-size: 22px;
        }
        .ms-empty-title { font-size: 14.5px; font-weight: 600; color: #374151; margin-bottom: 5px; }
        .ms-empty-sub { font-size: 12.5px; color: #9CA3AF; line-height: 1.6; }

        /* ── Footer ── */
        .ms-footer {
          margin-top: 28px;
          opacity: 0; transition: opacity 380ms ease 300ms;
        }
        .ms-footer.in { opacity: 1; }

       .ms-signout {
  width: 100%; height: 42px;
  background: #FFFBEB;
  border: 2px solid #FACC15;
  border-radius: 8px;
  font-family: inherit; font-size: 13px; font-weight: 700;
  color: #1E293B;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 7px;
  transition: all 150ms ease;
  box-shadow: 0 2px 8px rgba(250,204,21,0.2);
  margin-bottom: 18px;
}
.ms-signout:hover {
  background: #FEF9C3;
  border-color: #EAB308;
  box-shadow: 0 4px 12px rgba(250,204,21,0.3);
  transform: translateY(-1px);
}

        .ms-powered {
  text-align: center;
  font-size: 11.5px;
  color: #9CA3AF;
  letter-spacing: 0.1px;
}
.ms-powered-name {
  font-weight: 700;
  color: #FACC15;
}
.ms-powered-dash {
  color: #D1D5DB;
  margin: 0 4px;
}

        /* ── Logout modal ── */
        .ms-overlay {
          position: fixed; inset: 0;
          background: rgba(17,24,39,0.35);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex; align-items: flex-end; justify-content: center;
          padding: 20px; z-index: 100;
          animation: overlayIn 180ms ease;
        }

        .ms-sheet {
          width: 100%; max-width: 480px;
          background: #fff; border-radius: 20px;
          padding: 26px 22px 22px;
          box-shadow: 0 -2px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05);
          animation: sheetUp 260ms cubic-bezier(0.34,1.2,0.64,1);
        }

        .ms-sheet-handle {
          width: 32px; height: 3px; background: #E5E7EB;
          border-radius: 2px; margin: 0 auto 22px;
        }

        .ms-sheet-icon {
          width: 44px; height: 44px;
          background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          color: #EF4444; margin-bottom: 14px;
        }

        .ms-sheet-title {
          font-size: 16px; font-weight: 700; color: #111827;
          letter-spacing: -0.3px; margin-bottom: 5px;
        }

        .ms-sheet-sub {
          font-size: 12.5px; color: #6B7280; line-height: 1.65; margin-bottom: 22px;
        }

        .ms-sheet-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }

        .ms-btn-stay {
          height: 42px; background: #F9FAFB; border: 1px solid #E5E7EB;
          border-radius: 8px; font-family: inherit; font-size: 13.5px;
          font-weight: 500; color: #374151; cursor: pointer; transition: all 150ms ease;
        }
        .ms-btn-stay:hover { background: #F3F4F6; }

        .ms-btn-confirm {
          height: 42px; background: #EF4444; border: none; border-radius: 8px;
          font-family: inherit; font-size: 13.5px; font-weight: 600;
          color: #fff; cursor: pointer; transition: all 150ms ease;
          box-shadow: 0 2px 8px rgba(239,68,68,0.25);
        }
        .ms-btn-confirm:hover { background: #DC2626; transform: translateY(-1px); }
        .ms-btn-confirm:active { transform: scale(0.97); }

        @media (max-width: 520px) {
          .ms-wrap { padding: 0 16px 48px; }
          .ms-name { font-size: 23px; }
        }
      `}</style>

      <div className="ms-page">
        <div className="ms-wrap">
          {/* Top bar */}
          <div className={`ms-topbar ${visible ? "in" : ""}`}>
            <div className="ms-brand">
              <div className="ms-brand-slug">
                CHEZAX <span>MALAWI</span>
              </div>
            </div>
            <div className="ms-topbar-right">
              <button className="ms-icon-btn" aria-label="Notifications">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {totalUnread > 0 && <span className="ms-notif-dot" />}
              </button>
              <button className="ms-avatar-btn" aria-label="Profile">
                <UserAvatar user={user} />
              </button>
            </div>
          </div>

          {/* Hero */}
          <div className={`ms-hero ${visible ? "in" : ""}`}>
            <p className="ms-greeting">{greeting()},</p>
            <h1 className="ms-name">{firstName}</h1>
            <div className="ms-badges">
              <span className="ms-badge ms-badge-role">{user.role}</span>
              <span
                className={`ms-badge ${user.subscription === "premium" ? "ms-badge-premium" : "ms-badge-basic"}`}
              >
                {user.subscription}
              </span>
            </div>
          </div>

          {/* Rule */}
          <div className={`ms-rule ${visible ? "in" : ""}`} />

          {/* Section head */}
          <div className={`ms-sec-head ${visible ? "in" : ""}`}>
            <span className="ms-sec-label">My Classes</span>
            <span className="ms-sec-count">
              {search
                ? `${filtered.length} of ${modules.length}`
                : modules.length}
            </span>
          </div>

          {/* Search */}
          {modules.length > 4 && (
            <div className={`ms-search-wrap ${visible ? "in" : ""}`}>
              <svg
                className="ms-search-icon"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="ms-search"
                placeholder="Search classes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}

          {/* List */}
          <div className="ms-list">
            {isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : filtered.length === 0 ? (
              <div className="ms-empty">
                <div className="ms-empty-icon">{search ? "🔍" : "📚"}</div>
                <p className="ms-empty-title">
                  {search ? "No classes found" : "No classes yet"}
                </p>
                <p className="ms-empty-sub">
                  {search
                    ? "Try a different search term"
                    : "You haven't been enrolled in any classes yet"}
                </p>
              </div>
            ) : (
              filtered.map((m, i) => (
                <ModuleCard
                  key={m.id}
                  module={m}
                  index={i}
                  onClick={() => onSelectModule(m)}
                  visible={cardsVisible}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className={`ms-footer ${visible ? "in" : ""}`}>
            <button className="ms-signout" onClick={() => setLogoutOpen(true)}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
            <p className="ms-powered">
              Powered by <span className="ms-powered-name">Rasta Kadema</span>
              <span className="ms-powered-dash">—</span>
              All rights reserved
            </p>
          </div>
        </div>
      </div>

      {/* Logout confirm */}
      {logoutOpen && (
        <div className="ms-overlay" onClick={() => setLogoutOpen(false)}>
          <div className="ms-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="ms-sheet-handle" />
            <div className="ms-sheet-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <p className="ms-sheet-title">Sign out of ChezaX?</p>
            <p className="ms-sheet-sub">
              You'll be redirected back to the YazaIT platform. Your unread
              messages will be right here when you return.
            </p>
            <div className="ms-sheet-actions">
              <button
                className="ms-btn-stay"
                onClick={() => setLogoutOpen(false)}
              >
                Stay
              </button>
              <button
                className="ms-btn-confirm"
                onClick={() => {
                  setLogoutOpen(false);
                  onLogout();
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
