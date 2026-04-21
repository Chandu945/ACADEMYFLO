// primitives.jsx — shared UI atoms for Academyflo
// Icons, status bar, nav, tabs, cards, badges — used by every screen.

const Icon = ({ name, size = 20, color = 'currentColor', strokeWidth = 1.8 }) => {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    home: <><path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></>,
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    check: <><path d="M4 12l5 5L20 6"/></>,
    checkCircle: <><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></>,
    wallet: <><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M16 14h2"/><path d="M3 9h18"/></>,
    rupee: <><path d="M6 3h12M6 8h12M9 13c5 0 5-10 0-10M6 13h3l9 8"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
    chart: <><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></>,
    chartBar: <><rect x="3" y="12" width="4" height="9"/><rect x="10" y="6" width="4" height="15"/><rect x="17" y="9" width="4" height="12"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    filter: <><path d="M3 5h18M6 12h12M10 19h4"/></>,
    sort: <><path d="M3 6h18M6 12h12M10 18h4"/></>,
    more: <><circle cx="12" cy="5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/></>,
    moreH: <><circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/></>,
    chevR: <><path d="M9 5l7 7-7 7"/></>,
    chevL: <><path d="M15 5l-7 7 7 7"/></>,
    chevD: <><path d="M5 9l7 7 7-7"/></>,
    chevU: <><path d="M19 15l-7-7-7 7"/></>,
    close: <><path d="M6 6l12 12M18 6L6 18"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h0a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v0a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="M17.9 17.9A10.7 10.7 0 0 1 12 20c-7 0-11-8-11-8a19.8 19.8 0 0 1 5.1-5.9M9.9 4.2A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a19.7 19.7 0 0 1-2.2 3.2M1 1l22 22"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    phone: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    clipboard: <><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></>,
    trash: <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.4 2.6a2 2 0 1 1 2.8 2.8L12 14.5 8 15.5l1-4z"/></>,
    alert: <><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></>,
    warn: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/></>,
    info: <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></>,
    heart: <><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.5 1-1a5.5 5.5 0 0 0 0-7.8z"/></>,
    gift: <><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></>,
    pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    building: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 21V9h6v12M9 3v6h6V3"/></>,
    wifi: <><path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a6 6 0 0 1 7 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
    doc: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
    play: <><path d="M5 3l14 9-14 9z" fill="currentColor"/></>,
    star: <><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></>,
    trendingUp: <><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></>,
    refresh: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></>,
    sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>,
    whatsapp: <><path d="M20.5 3.5A11 11 0 0 0 3 17l-1.5 5.5L7 21a11 11 0 0 0 16.5-9.5 11 11 0 0 0-3-8zM12 20a8 8 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8 8 0 1 1 12 20z"/><path d="M16.5 14.5c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.1-.5 0a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.6-1.2a.4.4 0 0 0 0-.4c0-.1-.5-1.3-.7-1.7s-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11 11 0 0 0 4.2 3.7c1.5.6 2.1.7 2.8.6a2.5 2.5 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c-.1-.1-.2-.2-.4-.3z" fill="currentColor"/></>,
    send: <><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>,
    menu: <><path d="M3 6h18M3 12h18M3 18h18"/></>,
  };
  return <svg {...p}>{paths[name] || paths.alert}</svg>;
};

// iPhone 14 status bar (dark)
const StatusBar = ({ time = '9:41' }) => (
  <div className="af-status">
    <span>{time}</span>
    <div className="icons">
      <svg width="18" height="11" viewBox="0 0 18 11" fill="#E6E9F2">
        <rect x="0" y="7" width="3" height="4" rx="0.6"/>
        <rect x="4.5" y="5" width="3" height="6" rx="0.6"/>
        <rect x="9" y="2.5" width="3" height="8.5" rx="0.6"/>
        <rect x="13.5" y="0" width="3" height="11" rx="0.6"/>
      </svg>
      <svg width="16" height="11" viewBox="0 0 16 11" fill="#E6E9F2" style={{ marginLeft: 4 }}>
        <path d="M8 2a9.5 9.5 0 0 1 6.3 2.4l1-1A11 11 0 0 0 8 .5 11 11 0 0 0 .7 3.4l1 1A9.5 9.5 0 0 1 8 2z"/>
        <path d="M8 5a6.5 6.5 0 0 1 4.3 1.6l1-1A8 8 0 0 0 8 3.5a8 8 0 0 0-5.3 2.1l1 1A6.5 6.5 0 0 1 8 5z"/>
        <circle cx="8" cy="9" r="1.5"/>
      </svg>
      <svg width="26" height="12" viewBox="0 0 26 12" fill="none" style={{ marginLeft: 4 }}>
        <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="#E6E9F2" strokeOpacity="0.4"/>
        <rect x="2" y="2" width="19" height="8" rx="1.5" fill="#E6E9F2"/>
        <path d="M24 4v4c.6-.2 1-.8 1-2s-.4-1.8-1-2z" fill="#E6E9F2" opacity="0.5"/>
      </svg>
    </div>
  </div>
);

const Screen = ({ children, label }) => (
  <div className="af af-screen" data-screen-label={label}>
    <StatusBar />
    {children}
    <div className="af-home" />
  </div>
);

// Bottom tab bar
const TabBar = ({ tabs, active, onTab }) => (
  <div className="af-tabs">
    {tabs.map((t) => (
      <div key={t.key} className={`af-tab ${active === t.key ? 'active' : ''}`} onClick={() => onTab && onTab(t.key)}>
        <div className="tab-ico-bg"><Icon name={t.icon} size={18} /></div>
        <span>{t.label}</span>
      </div>
    ))}
  </div>
);

// App bar
const AppBar = ({ title, large, back, onBack, actions, transparent }) => (
  <div className="af-appbar" style={transparent ? { background: 'transparent' } : {}}>
    {back && <div className="icon-btn" onClick={onBack}><Icon name="chevL" size={18} /></div>}
    <div className={`title ${large ? 'left' : ''}`}>{title}</div>
    {actions ? actions : back ? <div style={{ width: 36 }} /> : null}
  </div>
);

const Avatar = ({ name, size = 'md', photo, gradient, status }) => {
  const initials = (name || '??').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const cls = `af-avatar ${size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : size === 'xl' ? 'xl' : ''}`;
  const style = gradient ? { background: gradient } : {};
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div className={cls} style={style}>{initials}</div>
      {status && <div style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, background: status === 'present' ? '#10B981' : status === 'absent' ? '#EF4444' : '#F59E0B', border: '2px solid #05070D' }} />}
    </div>
  );
};

const Badge = ({ kind, children }) => <span className={`af-badge ${kind}`}>{children}</span>;

const Card = ({ children, interactive, onClick, style, className = '' }) => (
  <div onClick={onClick} className={`af-card ${interactive ? 'interactive' : ''} ${className}`} style={style}>{children}</div>
);

const Chip = ({ active, children, onClick }) => (
  <span className={`af-chip ${active ? 'active' : ''}`} onClick={onClick}>{children}</span>
);

// Gradient glyph — used in place of illustrations
const GradGlyph = ({ icon, size = 64 }) => (
  <div style={{
    width: size, height: size, borderRadius: size * 0.3,
    background: 'linear-gradient(135deg, rgba(124,58,237,0.24), rgba(59,130,246,0.24))',
    border: '1px solid rgba(139,92,246,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#A78BFA',
  }}><Icon name={icon} size={size * 0.45} /></div>
);

// Empty state
const EmptyState = ({ icon = 'sparkle', title, body, action }) => (
  <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
    <GradGlyph icon={icon} />
    <div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5, maxWidth: 260, margin: '0 auto' }}>{body}</div>
    </div>
    {action}
  </div>
);

// Button
const Button = ({ children, variant = 'primary', size = 'md', block, onClick, icon, disabled, loading }) => (
  <button className={`af-btn ${variant} ${size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : ''} ${block ? 'block' : ''}`} onClick={disabled || loading ? undefined : onClick} disabled={disabled} style={disabled ? { opacity: 0.5 } : {}}>
    {loading ? <LoadSpinner /> : icon ? <Icon name={icon} size={16} /> : null}
    {children}
  </button>
);

const LoadSpinner = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'afspin 0.8s linear infinite' }}>
    <circle cx="12" cy="12" r="9" stroke={color} strokeOpacity="0.2" strokeWidth="2.5"/>
    <path d="M21 12a9 9 0 0 0-9-9" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

// inject spinner keyframes + font
if (typeof document !== 'undefined' && !document.getElementById('af-keyframes')) {
  const s = document.createElement('style');
  s.id = 'af-keyframes';
  s.textContent = '@keyframes afspin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);

  // Inter from Google Fonts
  if (!document.querySelector('link[href*="Inter"]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(l);
  }
}

Object.assign(window, {
  Icon, StatusBar, Screen, TabBar, AppBar,
  Avatar, Badge, Card, Chip, Button, LoadSpinner,
  GradGlyph, EmptyState,
});
