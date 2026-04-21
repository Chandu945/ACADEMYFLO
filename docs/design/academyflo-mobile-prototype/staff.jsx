// staff.jsx — Staff portal screens

const STAFF_TABS = [
  { key: 'dashboard', label: 'Home', icon: 'home' },
  { key: 'attendance', label: 'Attendance', icon: 'check' },
  { key: 'students', label: 'Students', icon: 'users' },
  { key: 'more', label: 'More', icon: 'grid' },
];

const StaffDashboard = ({ onTab }) => (
  <Screen label="Staff · Dashboard">
    <AppBar large title={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Avatar name="Rahul K" size="sm" gradient="linear-gradient(135deg,#06B6D4,#3B82F6)" />
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textAlign: 'left' }}>Coach</div>
        <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', textAlign: 'left' }}>Rahul Krishnan</div>
      </div>
    </div>} actions={<div className="icon-btn"><Icon name="bell" size={18} /></div>} />

    <div className="af-content">
      {/* reminder */}
      <div style={{ padding: '4px 16px 0' }}>
        <Card style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.18),rgba(239,68,68,0.08))', borderColor: 'rgba(245,158,11,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FBBF24' }}>
              <Icon name="alert" size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Attendance pending</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Mark Football A before 5 PM</div>
            </div>
            <Button size="sm">Mark now</Button>
          </div>
        </Card>
      </div>

      <div className="af-section-hdr"><div className="hdr">Today's classes</div><span style={{ fontSize: 13, color: 'var(--text-3)' }}>21 Apr</span></div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { time: '06:30', dur: '90', batch: 'Football A', count: 20, done: true },
          { time: '16:00', dur: '90', batch: 'Football A · U-14', count: 18, done: false },
          { time: '17:30', dur: '75', batch: 'Football B', count: 22, done: false },
        ].map((c, i) => (
          <Card key={i} tight interactive>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 56, textAlign: 'center', padding: '6px 0', borderRadius: 10, background: c.done ? 'rgba(16,185,129,0.1)' : 'var(--surface-3)' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: c.done ? '#34D399' : 'var(--text-1)', letterSpacing: '-0.02em' }}>{c.time}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{c.dur}m</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.batch}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.count} students · Ground 2</div>
              </div>
              {c.done ? <Badge kind="paid">Done</Badge> : <Badge kind="upcoming">Upcoming</Badge>}
            </div>
          </Card>
        ))}
      </div>

      <div className="af-section-hdr"><div className="hdr">Announcements from owner</div></div>
      <div style={{ padding: '0 16px' }}>
        <Card>
          <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <Avatar name="Priya V" size="sm" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Priya Venkatesh</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Yesterday · 6:14 PM</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>Inter-academy tournament registration closes on 30 April. Please share details with parents of U-12 and U-14 batches.</div>
        </Card>
      </div>
    </div>
    <TabBar tabs={STAFF_TABS} active="dashboard" onTab={onTab} />
  </Screen>
);

Object.assign(window, { StaffDashboard, STAFF_TABS });
