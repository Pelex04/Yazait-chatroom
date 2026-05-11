import { Calendar } from 'lucide-react';

const MaintenancePage = () => {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ fontFamily: "'DM Sans', sans-serif", background: '#fafaf8', color: '#0f0f0e' }}
    >
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@400;500&display=swap');

        :root {
          --cx-black: #0f0f0e;
          --cx-white: #fafaf8;
          --cx-surface: #f4f3f0;
          --cx-border: #e2e0da;
          --cx-muted: #8a8880;
          --cx-accent: #c8a86b;
          --cx-accent-dim: #f0e8d8;
        }

        @keyframes rise {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .cx-anim-1 { opacity: 0; animation: rise 0.55s cubic-bezier(0.22,1,0.36,1) 0.05s forwards; }
        .cx-anim-2 { opacity: 0; animation: rise 0.55s cubic-bezier(0.22,1,0.36,1) 0.15s forwards; }
        .cx-anim-3 { opacity: 0; animation: rise 0.55s cubic-bezier(0.22,1,0.36,1) 0.22s forwards; }
        .cx-anim-4 { opacity: 0; animation: rise 0.55s cubic-bezier(0.22,1,0.36,1) 0.30s forwards; }
        .cx-anim-5 { opacity: 0; animation: rise 0.55s cubic-bezier(0.22,1,0.36,1) 0.35s forwards; }
        .cx-anim-6 { opacity: 0; animation: rise 0.55s cubic-bezier(0.22,1,0.36,1) 0.42s forwards; }
        .cx-anim-7 { opacity: 0; animation: rise 0.55s cubic-bezier(0.22,1,0.36,1) 0.50s forwards; }

        .cx-support-link {
          color: var(--cx-black);
          font-weight: 500;
          text-decoration: none;
          border-bottom: 1px solid var(--cx-border);
          padding-bottom: 1px;
          transition: border-color 0.2s;
        }
        .cx-support-link:hover {
          border-color: var(--cx-black);
        }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: '1px solid #e2e0da', padding: '1.1rem 2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32, height: 32,
              background: '#0f0f0e',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '0.02em', fontFamily: "'DM Mono', monospace" }}>
              CX
            </span>
          </div>
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', color: '#0f0f0e' }}>
            ChezaX
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
        <div style={{ maxWidth: 620, width: '100%' }}>

          {/* Eyebrow */}
          <div className="cx-anim-1" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
            <span style={{ width: 28, height: 1, background: '#8a8880', display: 'block' }} />
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a8880', fontFamily: "'DM Mono', monospace" }}>
              System maintenance
            </span>
          </div>

          {/* Heading */}
          <h1
            className="cx-anim-2"
            style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.08, color: '#0f0f0e', marginBottom: '1.25rem' }}
          >
            We're improving<br />the platform.
          </h1>

          {/* Subtitle */}
          <p
            className="cx-anim-3"
            style={{ fontSize: 17, fontWeight: 300, color: '#8a8880', lineHeight: 1.65, maxWidth: 480 }}
          >
            ChezaX is currently undergoing scheduled maintenance. We'll be back online shortly — thank you for your patience.
          </p>

          {/* Divider */}
          <div className="cx-anim-4" style={{ width: '100%', height: 1, background: '#e2e0da', margin: '2.5rem 0' }} />

          {/* Meta grid */}
          <div
            className="cx-anim-5"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1,
              background: '#e2e0da',
              border: '1px solid #e2e0da',
              borderRadius: 12,
              overflow: 'hidden',
              marginBottom: '2rem',
            }}
          >
            <div style={{ background: '#f4f3f0', padding: '1.4rem 1.5rem' }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8a8880', fontFamily: "'DM Mono', monospace", marginBottom: '0.5rem' }}>
                Status
              </div>
              <div style={{ fontSize: 17, fontWeight: 500, color: '#0f0f0e', letterSpacing: '-0.01em' }}>
                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#c8a86b', marginRight: 6, verticalAlign: 'middle', position: 'relative', top: -1 }} />
                In progress
              </div>
            </div>
            <div style={{ background: '#f4f3f0', padding: '1.4rem 1.5rem' }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8a8880', fontFamily: "'DM Mono', monospace", marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={11} />
                Expected completion
              </div>
              <div style={{ fontSize: 17, fontWeight: 500, color: '#0f0f0e', letterSpacing: '-0.01em' }}>
                June 1, 2026
              </div>
            </div>
          </div>

          {/* Work list */}
          <ul
            className="cx-anim-6"
            style={{ listStyle: 'none', border: '1px solid #e2e0da', borderRadius: 12, overflow: 'hidden' }}
          >
            {[
              { num: '01', text: 'Enhanced performance and reliability', tag: 'infra' },
              { num: '02', text: 'New features and improvements',         tag: 'product' },
              { num: '03', text: 'Security updates and optimizations',    tag: 'security' },
            ].map((item, i, arr) => (
              <li
                key={item.num}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '1rem 1.5rem',
                  borderBottom: i < arr.length - 1 ? '1px solid #e2e0da' : 'none',
                  background: '#ffffff',
                }}
              >
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#8a8880', minWidth: 20 }}>
                  {item.num}
                </span>
                <span style={{ fontSize: 14.5, color: '#0f0f0e', fontWeight: 400 }}>
                  {item.text}
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 11,
                    fontFamily: "'DM Mono', monospace",
                    fontWeight: 500,
                    padding: '3px 9px',
                    borderRadius: 4,
                    background: '#f0e8d8',
                    color: '#7a5e2a',
                  }}
                >
                  {item.tag}
                </span>
              </li>
            ))}
          </ul>

          {/* Support */}
          <div className="cx-anim-7" style={{ marginTop: '2rem', fontSize: 13.5, color: '#8a8880' }}>
            Need assistance?{' '}
            <a href="mailto:rastakadema@gmail.com" className="cx-support-link">
              Contact support
            </a>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #e2e0da', padding: '1.4rem 2.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#8a8880', letterSpacing: '0.01em' }}>
          Powered by <span style={{ color: '#0f0f0e', fontWeight: 500 }}>Rasta Kadema</span>
        </p>
      </footer>
    </div>
  );
};

export default MaintenancePage;
