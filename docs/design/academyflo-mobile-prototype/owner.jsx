// owner.jsx — Owner portal screens

const OWNER_TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'students', label: 'Students', icon: 'users' },
  { key: 'attendance', label: 'Attendance', icon: 'check' },
  { key: 'fees', label: 'Fees', icon: 'wallet' },
  { key: 'more', label: 'More', icon: 'grid' },
];

const INR = (n) => '₹' + n.toLocaleString('en-IN');

// ═══════════ DASHBOARD ═══════════
const OwnerDashboard = ({ onTab }) => {
  const kpis = [
    { icon: 'users', val: '248', lbl: 'Active students', delta: '+12', up: true },
    { icon: 'rupee', val: '₹2.4L', lbl: 'This month', delta: '+18%', up: true },
    { icon: 'checkCircle', val: '87%', lbl: 'Attendance', delta: '-2%', up: false },
    { icon: 'alert', val: '₹34,500', lbl: 'Pending dues', delta: '14 students', up: false, neutral: true },
  ];
  const birthdays = [
    { name: 'Aarav Mehta', batch: 'U-12 Cricket', when: 'Today' },
    { name: 'Kavya Raj', batch: 'Jr. Swimming', when: 'Wed' },
    { name: 'Ishaan Kumar', batch: 'Football A', when: 'Fri' },
  ];

  return (
    <Screen label="Owner · Dashboard">
      <AppBar large title={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name="Priya V" size="sm" />
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, letterSpacing: 0, textAlign: 'left' }}>Good morning</div>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', textAlign: 'left' }}>Priya</div>
        </div>
      </div>} actions={<>
        <div className="icon-btn" style={{ position: 'relative' }}>
          <Icon name="bell" size={18} />
          <div style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 4, background: '#EF4444', border: '1.5px solid var(--bg)' }} />
        </div>
      </>} />

      <div className="af-content">
        {/* KPI grid */}
        <div style={{ padding: '4px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {kpis.map((k, i) => (
            <div key={i} className="af-kpi">
              <div className="glyph"><Icon name={k.icon} size={15} /></div>
              <div className="val">{k.val}</div>
              <div className="lbl">{k.lbl}</div>
              <div className={`delta ${!k.up && !k.neutral ? 'down' : ''}`} style={k.neutral ? { color: 'var(--text-3)' } : {}}>
                {!k.neutral && <Icon name={k.up ? 'trendingUp' : 'chevD'} size={11} />}
                {k.delta}
              </div>
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        <div style={{ padding: '8px 16px 0' }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>Revenue</div>
                <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 2 }}>₹18.6L</div>
                <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 2 }}>↑ 22% vs last 6 months</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <Chip active>6M</Chip>
                <Chip>1Y</Chip>
              </div>
            </div>
            {/* chart svg */}
            <svg viewBox="0 0 320 100" style={{ width: '100%', height: 100 }}>
              <defs>
                <linearGradient id="gfill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.35"/>
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="gstr" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#7C3AED"/>
                  <stop offset="100%" stopColor="#3B82F6"/>
                </linearGradient>
              </defs>
              <path d="M0,72 L40,64 L80,58 L120,44 L160,52 L200,36 L240,28 L280,22 L320,14 L320,100 L0,100 Z" fill="url(#gfill)"/>
              <path d="M0,72 L40,64 L80,58 L120,44 L160,52 L200,36 L240,28 L280,22 L320,14" fill="none" stroke="url(#gstr)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>
              <circle cx="280" cy="22" r="4" fill="#7C3AED"/>
              <circle cx="280" cy="22" r="10" fill="#7C3AED" opacity="0.2"/>
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-4)', marginTop: 6 }}>
              <span>Nov</span><span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span>
            </div>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="af-section-hdr"><div className="hdr">Quick actions</div></div>
        <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: 'check', label: 'Mark attendance', tab: 'attendance' },
            { icon: 'plus', label: 'Add student', tab: 'students' },
            { icon: 'wallet', label: 'Collect fee', tab: 'fees' },
            { icon: 'rupee', label: 'Add expense', tab: 'more' },
          ].map((a, i) => (
            <Card key={i} interactive tight onClick={() => onTab && onTab(a.tab)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--grad-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A78BFA' }}>
                  <Icon name={a.icon} size={16} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{a.label}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Today's attendance */}
        <div className="af-section-hdr"><div className="hdr">Today · 21 Apr</div><span className="link">Mark now</span></div>
        <div style={{ padding: '0 16px' }}>
          <Card>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { n: 186, l: 'Present', c: '#10B981' },
                { n: 24, l: 'Absent', c: '#EF4444' },
                { n: 38, l: 'Pending', c: '#F59E0B' },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 12, background: `color-mix(in oklab, ${s.c} 10%, transparent)` }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.c, letterSpacing: '-0.02em' }}>{s.n}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Birthdays */}
        <div className="af-section-hdr"><div className="hdr">Birthdays this week</div></div>
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {birthdays.map((b, i) => (
            <Card key={i} tight>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={b.name} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{b.batch}</div>
                </div>
                <Badge kind={b.when === 'Today' ? 'paid' : 'upcoming'}>{b.when}</Badge>
                <Icon name="gift" size={18} color="#F472B6" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <TabBar tabs={OWNER_TABS} active="dashboard" onTab={onTab} />
    </Screen>
  );
};

// ═══════════ STUDENTS ═══════════
const STUDENTS = [
  { name: 'Aarav Mehta', batch: 'U-12 Cricket', status: 'active', fee: 'paid' },
  { name: 'Diya Sharma', batch: 'Senior Swimming', status: 'active', fee: 'due' },
  { name: 'Ishaan Kumar', batch: 'Football A', status: 'active', fee: 'paid' },
  { name: 'Kavya Raj', batch: 'Jr. Swimming', status: 'active', fee: 'overdue' },
  { name: 'Arjun Pillai', batch: 'U-14 Cricket', status: 'inactive', fee: 'paid' },
  { name: 'Meera Iyer', batch: 'Badminton B', status: 'active', fee: 'paid' },
  { name: 'Reyansh Gupta', batch: 'Football B', status: 'active', fee: 'due' },
  { name: 'Anaya Nair', batch: 'Tennis Beginner', status: 'left', fee: 'paid' },
];

const OwnerStudents = ({ onTab, onOpen }) => (
  <Screen label="Owner · Students">
    <AppBar large title="Students" actions={<>
      <div className="icon-btn"><Icon name="search" size={18} /></div>
      <div className="icon-btn" style={{ background: 'var(--grad)', border: 'none' }}><Icon name="plus" size={18} color="white" /></div>
    </>} />

    <div className="af-content">
      <div style={{ padding: '4px 16px 12px' }}>
        <div style={{ position: 'relative' }}>
          <Icon name="search" size={16} color="var(--text-3)" />
          <input className="af-input" style={{ paddingLeft: 40 }} placeholder="Search by name, batch, phone..." />
          <div style={{ position: 'absolute', left: 14, top: 16 }}><Icon name="search" size={16} color="var(--text-3)" /></div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', overflowX: 'auto' }}>
        <Chip active>All · 248</Chip>
        <Chip>Active · 231</Chip>
        <Chip>Due · 14</Chip>
        <Chip>Inactive · 12</Chip>
        <Chip>Left · 5</Chip>
      </div>

      <div style={{ padding: '0 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>8 of 248 students</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }}>
          <Icon name="sort" size={14} /> Name A–Z
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STUDENTS.map((s, i) => (
          <Card key={i} interactive onClick={onOpen} tight>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={s.name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{s.name}</div>
                  {s.fee === 'overdue' && <div style={{ width: 6, height: 6, borderRadius: 3, background: '#EF4444' }} />}
                  {s.fee === 'due' && <div style={{ width: 6, height: 6, borderRadius: 3, background: '#F59E0B' }} />}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{s.batch}</div>
              </div>
              <Badge kind={s.status}>{s.status}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>

    <TabBar tabs={OWNER_TABS} active="students" onTab={onTab} />
  </Screen>
);

// ═══════════ STUDENT DETAIL ═══════════
const OwnerStudentDetail = ({ onBack }) => {
  const [tab, setTab] = React.useState('overview');
  return (
    <Screen label="Owner · Student detail">
      <AppBar back onBack={onBack} title="" actions={<div className="icon-btn"><Icon name="more" size={18} /></div>} />
      <div className="af-content">
        <div style={{ padding: '0 24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Avatar name="Aarav Mehta" size="xl" gradient="linear-gradient(135deg, #EC4899, #8B5CF6)" />
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 14 }}>Aarav Mehta</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>AF-2024-0086 · U-12 Cricket</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Badge kind="active">Active</Badge>
            <Badge kind="paid">Fees paid</Badge>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button variant="secondary" size="sm" icon="phone">Call</Button>
            <Button variant="secondary" size="sm" icon="mail">Message</Button>
            <Button variant="secondary" size="sm" icon="edit">Edit</Button>
          </div>
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '4px 4px', margin: '0 16px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
          {['overview', 'attendance', 'fees', 'docs', 'parent'].map((t) => (
            <div key={t} onClick={() => setTab(t)} style={{
              flex: 1, textAlign: 'center', padding: '8px 0', fontSize: 12, fontWeight: 500,
              borderRadius: 9, cursor: 'pointer', textTransform: 'capitalize',
              background: tab === t ? 'var(--grad)' : 'transparent',
              color: tab === t ? 'white' : 'var(--text-3)',
            }}>{t}</div>
          ))}
        </div>

        {tab === 'overview' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Card>
              {[
                ['Date of birth', '12 Jun 2013'],
                ['Joined on', '14 Aug 2024'],
                ['Monthly fee', '₹3,500'],
                ['Phone', '+91 98456 01234'],
                ['Address', 'Indiranagar, Bengaluru'],
              ].map(([k, v], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{k}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </Card>
            <Card>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 10 }}>This month</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>18</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Classes attended</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#34D399' }}>92%</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Attendance rate</div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Screen>
  );
};

// ═══════════ ATTENDANCE ═══════════
const OwnerAttendance = ({ onTab }) => {
  const [marks, setMarks] = React.useState({ 0: 'P', 1: 'P', 2: 'A', 3: 'P', 4: null, 5: 'H', 6: 'P' });
  const roster = STUDENTS.slice(0, 7);
  const toggle = (i) => {
    const order = { P: 'A', A: 'H', H: null, null: 'P' };
    setMarks({ ...marks, [i]: order[marks[i] ?? null] ?? 'P' });
  };
  const colors = { P: '#10B981', A: '#EF4444', H: '#F59E0B' };
  const bg = { P: 'rgba(16,185,129,0.12)', A: 'rgba(239,68,68,0.12)', H: 'rgba(245,158,11,0.12)' };

  return (
    <Screen label="Owner · Attendance">
      <AppBar large title="Attendance" actions={<div className="icon-btn"><Icon name="chart" size={18} /></div>} />
      <div className="af-content">
        <div style={{ padding: '4px 16px 12px' }}>
          <Card tight style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Icon name="chevL" size={18} color="var(--text-3)" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Monday</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>21 April 2026</div>
            </div>
            <Icon name="chevR" size={18} color="var(--text-3)" />
          </Card>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', overflowX: 'auto' }}>
          <Chip active>U-12 Cricket · 18</Chip>
          <Chip>Swimming Jr · 22</Chip>
          <Chip>Football A · 20</Chip>
        </div>

        <div style={{ padding: '0 16px', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['P', 'Present', '#10B981'], ['A', 'Absent', '#EF4444'], ['H', 'Holiday', '#F59E0B']].map(([k, l, c]) => {
              const count = Object.values(marks).filter(v => v === k).length;
              return (
                <div key={k} style={{ flex: 1, padding: 10, borderRadius: 12, background: `color-mix(in oklab, ${c} 10%, transparent)`, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: c }}>{count}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{l}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {roster.map((s, i) => (
            <Card key={i} tight onClick={() => toggle(i)} interactive>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={s.name} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Roll {(100 + i).toString()}</div>
                </div>
                {marks[i] ? (
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: bg[marks[i]], color: colors[marks[i]], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>{marks[i]}</div>
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: 12, border: '1.5px dashed var(--border-strong)', color: 'var(--text-4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={14} /></div>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div style={{ padding: '16px' }}>
          <Button block variant="secondary">Mark remaining as absent</Button>
        </div>
      </div>
      <TabBar tabs={OWNER_TABS} active="attendance" onTab={onTab} />
    </Screen>
  );
};

// ═══════════ FEES ═══════════
const OwnerFees = ({ onTab }) => {
  const [scope, setScope] = React.useState('unpaid');
  const dues = [
    { name: 'Diya Sharma', batch: 'Sr. Swimming', amount: 3800, status: 'due', days: 4 },
    { name: 'Kavya Raj', batch: 'Jr. Swimming', amount: 2800, status: 'overdue', days: 18 },
    { name: 'Reyansh Gupta', batch: 'Football B', amount: 3500, status: 'due', days: 2 },
    { name: 'Vivaan Shah', batch: 'U-14 Cricket', amount: 4200, status: 'overdue', days: 31 },
    { name: 'Sara Khan', batch: 'Tennis Int.', amount: 4500, status: 'due', days: 6 },
  ];
  return (
    <Screen label="Owner · Fees">
      <AppBar large title="Fees" actions={<div className="icon-btn"><Icon name="download" size={18} /></div>} />
      <div className="af-content">
        <div style={{ padding: '4px 16px 0' }}>
          <Card style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.1))', borderColor: 'rgba(139,92,246,0.3)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>Collected in April</div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 4 }}>{INR(212500)}</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
              <div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>Collected</div><div style={{ fontSize: 14, fontWeight: 600, color: '#34D399' }}>192 students</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>Pending</div><div style={{ fontSize: 14, fontWeight: 600, color: '#FBBF24' }}>₹34,500 · 14</div></div>
            </div>
          </Card>
        </div>

        <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', padding: 4, background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
            {[['unpaid', 'Unpaid · 14'], ['paid', 'Paid · 192']].map(([k, l]) => (
              <div key={k} onClick={() => setScope(k)} style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 7, cursor: 'pointer',
                background: scope === k ? 'var(--grad)' : 'transparent',
                color: scope === k ? 'white' : 'var(--text-3)',
              }}>{l}</div>
            ))}
          </div>
          <div className="af-chip"><Icon name="calendar" size={13} /> April</div>
        </div>

        <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dues.map((d, i) => (
            <Card key={i} tight interactive>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={d.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 1 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{d.batch} · {d.days}d {d.status === 'overdue' ? 'overdue' : 'to due'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: d.status === 'overdue' ? '#F87171' : 'var(--text-1)' }}>{INR(d.amount)}</div>
                  <Badge kind={d.status}>{d.status}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <TabBar tabs={OWNER_TABS} active="fees" onTab={onTab} />
    </Screen>
  );
};

// ═══════════ MORE ═══════════
const OwnerMore = ({ onTab }) => {
  const items = [
    { group: 'Academy', rows: [
      { icon: 'users', label: 'Staff', detail: '8' },
      { icon: 'grid', label: 'Batches', detail: '14' },
      { icon: 'book', label: 'Enquiries', detail: '23' },
      { icon: 'calendar', label: 'Events & Gallery' },
      { icon: 'rupee', label: 'Expenses', detail: INR(48600) },
      { icon: 'chartBar', label: 'Reports' },
    ]},
    { group: 'Account', rows: [
      { icon: 'settings', label: 'Settings' },
      { icon: 'star', label: 'Subscription', detail: 'Pro · 47d' },
      { icon: 'user', label: 'Profile' },
      { icon: 'bell', label: 'Notifications' },
      { icon: 'info', label: 'Support & help' },
    ]},
  ];
  return (
    <Screen label="Owner · More">
      <AppBar large title="More" />
      <div className="af-content">
        {/* academy card */}
        <div style={{ padding: '4px 16px 0' }}>
          <Card className="af-grad-border">
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <Avatar name="Sunrise" size="lg" gradient="linear-gradient(135deg, #F97316, #EC4899)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Sunrise Sports Academy</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Bengaluru · 248 students</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <Badge kind="paid">Pro plan</Badge>
                  <Badge kind="upcoming">47d left</Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {items.map((grp, gi) => (
          <div key={gi}>
            <div className="af-section-hdr"><div className="hdr">{grp.group}</div></div>
            <div style={{ padding: '0 16px' }}>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {grp.rows.map((r, i) => (
                  <div key={i} className="af-row" style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}><Icon name={r.icon} size={16} /></div>
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{r.label}</div>
                    {r.detail && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.detail}</span>}
                    <Icon name="chevR" size={14} color="var(--text-4)" />
                  </div>
                ))}
              </Card>
            </div>
          </div>
        ))}

        <div style={{ padding: 16 }}>
          <Button block variant="secondary" icon="logout">Sign out</Button>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-4)', padding: '0 0 16px' }}>Academyflo v2.4.0 · build 2026.04.21</div>
      </div>
      <TabBar tabs={OWNER_TABS} active="more" onTab={onTab} />
    </Screen>
  );
};

Object.assign(window, {
  OwnerDashboard, OwnerStudents, OwnerStudentDetail, OwnerAttendance, OwnerFees, OwnerMore,
  OWNER_TABS,
});
