// components-sheet.jsx — Component library showcase

const ComponentSheet = () => (
  <Screen label="Components · Library">
    <AppBar large title="Components" />
    <div className="af-content" style={{ padding: '4px 16px' }}>

      {/* Colors */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '12px 0 8px' }}>Color tokens</div>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {[
          ['#05070D', 'bg'],
          ['#0A0E1A', 'bg-2'],
          ['#141824', 'surface-2'],
          ['#1C2233', 'surface-3'],
          ['linear-gradient(135deg,#7C3AED,#3B82F6)', 'accent-gradient'],
          ['#10B981', 'success'],
          ['#F59E0B', 'warning'],
          ['#EF4444', 'danger'],
          ['#06B6D4', 'info'],
        ].map(([c, l], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: c, border: '1px solid var(--border)' }} />
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{l}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>{c.includes('gradient') ? '7C3AED → 3B82F6' : c}</div>
          </div>
        ))}
      </Card>

      {/* Type */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '20px 0 8px' }}>Typography · Inter</div>
      <Card>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Display 34/800</div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 10 }}>Heading 24/700</div>
        <div style={{ fontSize: 17, fontWeight: 600, marginTop: 8 }}>Title 17/600</div>
        <div style={{ fontSize: 15, fontWeight: 400, color: 'var(--text-2)', marginTop: 8 }}>Body 15/400 regular copy</div>
        <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-3)', marginTop: 6 }}>Small 13 secondary</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 6 }}>Overline 11/600</div>
      </Card>

      {/* Buttons */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '20px 0 8px' }}>Buttons</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" icon="plus">Add</Button>
          <Button size="sm" variant="secondary" icon="download">Export</Button>
          <Button size="sm" variant="danger" icon="trash">Delete</Button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </div>

      {/* Inputs */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '20px 0 8px' }}>Inputs</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="af-field"><label>Default</label><input className="af-input" placeholder="Type here" /></div>
        <div className="af-field"><label>Filled</label><input className="af-input" defaultValue="priya@sunrisesports.in" /></div>
        <div className="af-field"><label>Error</label>
          <input className="af-input" style={{ borderColor: 'rgba(239,68,68,0.6)', boxShadow: '0 0 0 3px rgba(239,68,68,0.1)' }} defaultValue="not-an-email" />
          <div style={{ fontSize: 11, color: '#F87171', marginTop: 4 }}>Enter a valid email address</div>
        </div>
      </div>

      {/* Badges */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '20px 0 8px' }}>Status badges</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Badge kind="active">Active</Badge>
        <Badge kind="inactive">Inactive</Badge>
        <Badge kind="left">Left</Badge>
        <Badge kind="paid">Paid</Badge>
        <Badge kind="due">Due</Badge>
        <Badge kind="overdue">Overdue</Badge>
        <Badge kind="pending">Pending</Badge>
        <Badge kind="failed">Failed</Badge>
        <Badge kind="upcoming">Upcoming</Badge>
      </div>

      {/* Avatars */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '20px 0 8px' }}>Avatars</div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Avatar name="AM" size="sm" />
        <Avatar name="Priya" />
        <Avatar name="Rahul K" size="lg" gradient="linear-gradient(135deg,#06B6D4,#3B82F6)" />
        <Avatar name="SA" size="xl" gradient="linear-gradient(135deg,#F97316,#EC4899)" />
      </div>

      {/* Skeleton */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '20px 0 8px' }}>Skeletons</div>
      <Card>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="af-skel" style={{ width: 40, height: 40, borderRadius: 12 }} />
          <div style={{ flex: 1 }}>
            <div className="af-skel" style={{ width: '65%', height: 12 }} />
            <div className="af-skel" style={{ width: '40%', height: 10, marginTop: 6 }} />
          </div>
        </div>
      </Card>
    </div>
  </Screen>
);

Object.assign(window, { ComponentSheet });
