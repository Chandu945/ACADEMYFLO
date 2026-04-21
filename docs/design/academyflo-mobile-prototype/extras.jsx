// extras.jsx — Global flows, cross-cutting screens, prototype shell

// ═══════════ GLOBAL / SYSTEM SCREENS ═══════════

const SplashScreen = () => (
  <Screen label="Global · Splash">
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(124,58,237,0.3), transparent 70%)' }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 88, height: 88, borderRadius: 24, background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 60px -10px rgba(124,58,237,0.6)' }}>
          <svg width="44" height="44" viewBox="0 0 32 32" fill="none"><path d="M16 4 4 10v8c0 6 5 10 12 10s12-4 12-10v-8L16 4z" stroke="white" strokeWidth="2.2" strokeLinejoin="round"/><path d="m10 14 6 4 6-4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.04em' }}>Academy<span className="af-grad-text">flo</span></div>
      </div>
      <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, textAlign: 'center' }}>
        <LoadSpinner size={22} color="var(--text-3)" />
      </div>
    </div>
  </Screen>
);

const ForceUpdateScreen = () => (
  <Screen label="Global · Force update">
    <div style={{ flex: 1, padding: '80px 24px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <GradGlyph icon="refresh" size={88} />
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 24, letterSpacing: '-0.02em' }}>Update required</div>
      <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 8, maxWidth: 280, lineHeight: 1.55 }}>Version 2.4.0 is available with critical security fixes. You'll need to update to continue.</div>
      <div style={{ flex: 1 }} />
      <Button block size="lg" icon="download">Update now</Button>
      <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 16 }}>Current 2.1.4 · Required 2.4.0</div>
    </div>
  </Screen>
);

const SubscriptionBlockedScreen = () => (
  <Screen label="Global · Subscription blocked">
    <div style={{ flex: 1, padding: '80px 24px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ width: 88, height: 88, borderRadius: 26, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FBBF24' }}>
        <Icon name="lock" size={40} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 24, letterSpacing: '-0.02em' }}>Subscription expired</div>
      <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 8, maxWidth: 300, lineHeight: 1.55 }}>Your academy's Academyflo Pro plan ended on 18 April. Renew to continue using the app.</div>
      <Card style={{ width: '100%', marginTop: 28, textAlign: 'left' }}>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Last active</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Sunrise Sports Academy</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Owner: Priya Venkatesh · +91 98456 31204</div>
      </Card>
      <div style={{ flex: 1 }} />
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button block size="lg">Renew subscription</Button>
        <Button block variant="tertiary">Contact owner</Button>
      </div>
    </div>
  </Screen>
);

const SessionExpiredScreen = () => (
  <Screen label="Global · Session expired">
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90 }} />
    <AppBar large title="Dashboard" />
    <div className="af-content" style={{ padding: 16, opacity: 0.4, pointerEvents: 'none' }}>
      <Card><div className="af-skel" style={{ height: 80 }} /></Card>
    </div>
    {/* modal */}
    <div className="af-sheet" style={{ zIndex: 100, padding: '24px 24px 36px' }}>
      <GradGlyph icon="lock" size={56} />
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 16, letterSpacing: '-0.02em' }}>Session expired</div>
      <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>For your security, we've signed you out after a period of inactivity. Please log in again to continue.</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <Button block>Log in again</Button>
      </div>
    </div>
  </Screen>
);

const ErrorBoundaryScreen = () => (
  <Screen label="Global · Error boundary">
    <div style={{ flex: 1, padding: '80px 24px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ width: 88, height: 88, borderRadius: 26, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F87171' }}>
        <Icon name="warn" size={40} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 24, letterSpacing: '-0.02em' }}>Something broke</div>
      <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 8, maxWidth: 300, lineHeight: 1.55 }}>We've logged the error. Please restart the app or share the error ID with support.</div>
      <Card style={{ width: '100%', marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>Error ID</div>
            <div style={{ fontSize: 13, fontFamily: 'ui-monospace, monospace', fontWeight: 500 }}>ERR_9F2A4C-20260421-1114</div>
          </div>
          <Button size="sm" variant="secondary" icon="copy">Copy</Button>
        </div>
      </Card>
      <div style={{ flex: 1 }} />
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button block size="lg">Restart app</Button>
        <Button block variant="tertiary">Report to support</Button>
      </div>
    </div>
  </Screen>
);

const OfflineBannerScreen = () => (
  <Screen label="Global · Offline banner">
    <AppBar large title="Students" />
    <div style={{ background: 'rgba(245,158,11,0.15)', borderTop: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 8, height: 8, borderRadius: 4, background: '#FBBF24', animation: 'afspin 1.5s linear infinite' }} />
      <div style={{ flex: 1, fontSize: 12, color: '#FBBF24', fontWeight: 500 }}>You're offline · Showing cached data</div>
      <Icon name="wifi" size={16} color="#FBBF24" />
    </div>
    <div className="af-content" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {['Aarav Mehta','Diya Sharma','Ishaan Kumar','Kavya Raj','Meera Iyer'].map((n, i) => (
        <Card key={i} tight>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar name={n} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{n}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Cached · 6m ago</div>
            </div>
          </div>
        </Card>
      ))}
      <Card style={{ opacity: 0.5, pointerEvents: 'none' }} tight>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', color: 'var(--text-3)' }}>
          <Icon name="wifi" size={14} /> <span style={{ fontSize: 12 }}>Queued actions will sync when you're back online</span>
        </div>
      </Card>
    </div>
  </Screen>
);

// Permission gate — same screen, different roles
const PermissionGateScreen = () => (
  <Screen label="Global · Permission gate">
    <AppBar back title="Student detail" />
    <div className="af-content">
      <div style={{ padding: '0 24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar name="Aarav Mehta" size="xl" gradient="linear-gradient(135deg,#EC4899,#8B5CF6)" />
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 14, letterSpacing: '-0.02em' }}>Aarav Mehta</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>U-12 Cricket · Roll 86</div>
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <Card style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.25)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Icon name="info" size={18} color="#60A5FA" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#60A5FA' }}>Viewing as Staff</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.45 }}>Fees, documents, status changes are hidden. Contact the owner for write access.</div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ padding: '0 16px' }}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {[
            { icon: 'user', label: 'Overview', ok: true },
            { icon: 'check', label: 'Attendance', ok: true },
            { icon: 'wallet', label: 'Fees', ok: false },
            { icon: 'doc', label: 'Documents', ok: true },
            { icon: 'edit', label: 'Edit guardian contact', ok: true },
            { icon: 'trash', label: 'Delete student', ok: false },
          ].map((r, i) => (
            <div key={i} className="af-row" style={{ borderTop: i ? '1px solid var(--border)' : 'none', opacity: r.ok ? 1 : 0.45 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}><Icon name={r.icon} size={16} /></div>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{r.label}</div>
              {r.ok ? <Icon name="chevR" size={14} color="var(--text-4)" /> : <Icon name="lock" size={14} color="var(--text-4)" />}
            </div>
          ))}
        </Card>
      </div>
    </div>
  </Screen>
);

// ═══════════ OWNER: CREATE STUDENT, INVITE PARENT ═══════════

const CreateStudentScreen = () => (
  <Screen label="Owner · Create student">
    <AppBar back title="New student" actions={<Button size="sm" variant="tertiary">Save</Button>} />
    <div className="af-content" style={{ padding: '4px 20px 24px' }}>
      {/* Photo picker */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 88, height: 88, borderRadius: 24, background: 'var(--surface-3)', border: '1.5px dashed var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
            <Icon name="camera" size={28} />
          </div>
          <div style={{ position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: 8, background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={14} color="white" />
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Student</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="af-field"><label>Full name *</label><input className="af-input" placeholder="e.g. Aarav Mehta" /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="af-field" style={{ flex: 1 }}><label>DOB</label><input className="af-input" placeholder="DD/MM/YYYY" /></div>
          <div className="af-field" style={{ flex: 1 }}><label>Joining</label><input className="af-input" defaultValue="21/04/2026" /></div>
        </div>
        <div className="af-field"><label>Batch(es) *</label>
          <div className="af-input" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 10, paddingBottom: 10, height: 'auto', minHeight: 48 }}>
            <Chip active>U-12 Cricket ×</Chip>
            <span style={{ color: 'var(--text-4)', fontSize: 14 }}>+ add</span>
          </div>
        </div>
        <div className="af-field"><label>Monthly fee (₹) *</label><input className="af-input" defaultValue="3,500" /></div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '24px 0 12px' }}>Guardian</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="af-field"><label>Guardian name *</label><input className="af-input" placeholder="e.g. Rohit Mehta" /></div>
        <div className="af-field"><label>Phone *</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="af-input" style={{ width: 86, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>🇮🇳 +91</div>
            <input className="af-input" style={{ flex: 1 }} placeholder="98xxx xxxxx" />
          </div>
        </div>
        <div className="af-field"><label>Email</label><input className="af-input" placeholder="optional" /></div>
      </div>
      <Button block size="lg" style={{ marginTop: 24 }}>Create student</Button>
    </div>
  </Screen>
);

const InviteParentSheet = () => (
  <Screen label="Owner · Invite parent">
    <AppBar large title="Aarav Mehta" />
    <div className="af-content" style={{ opacity: 0.35, pointerEvents: 'none', padding: 16 }}>
      <Card><div className="af-skel" style={{ height: 80 }} /></Card>
      <Card style={{ marginTop: 10 }}><div className="af-skel" style={{ height: 120 }} /></Card>
    </div>
    <div className="af-sheet-backdrop" />
    <div className="af-sheet" style={{ padding: '8px 20px 32px' }}>
      <div className="handle" />
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399' }}><Icon name="checkCircle" size={22} /></div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Parent invited</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Credentials sent to +91 98765 43210</div>
        </div>
      </div>

      <Card style={{ background: 'var(--surface-3)', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, marginBottom: 10, letterSpacing: '0.04em' }}>ONE-TIME CREDENTIALS</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg)', borderRadius: 10, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Username</div>
            <div style={{ fontSize: 14, fontFamily: 'ui-monospace, monospace', fontWeight: 500 }}>rohit.mehta.aarav</div>
          </div>
          <Icon name="copy" size={16} color="var(--text-2)" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg)', borderRadius: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Temporary password</div>
            <div style={{ fontSize: 14, fontFamily: 'ui-monospace, monospace', fontWeight: 500 }}>Flo-7K9x2m</div>
          </div>
          <Icon name="copy" size={16} color="var(--text-2)" />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.5 }}>Parent must change this on first login. Visible once only.</div>
      </Card>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button block variant="secondary" icon="whatsapp">WhatsApp</Button>
        <Button block icon="share">Share</Button>
      </div>
    </div>
  </Screen>
);

// ═══════════ OWNER · EVENTS, EXPENSES, ENQUIRIES ═══════════

const OwnerEventsScreen = () => (
  <Screen label="Owner · Events">
    <AppBar back title="Events & Gallery" actions={<div className="icon-btn" style={{ background: 'var(--grad)', border: 'none' }}><Icon name="plus" size={16} color="white" /></div>} />
    <div className="af-content">
      <div style={{ padding: '4px 16px 0', display: 'flex', gap: 8 }}>
        <Chip active>All · 12</Chip><Chip>Upcoming · 4</Chip><Chip>Past · 8</Chip>
      </div>
      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { date: '26 Apr', title: 'Parent-coach meeting', aud: 'All batches', photos: 0, st: 'upcoming' },
          { date: '18 May', title: 'Inter-academy tournament', aud: 'All', photos: 0, st: 'upcoming' },
          { date: '14 Mar', title: 'Annual sports day', aud: 'All', photos: 48, st: 'past' },
          { date: '02 Feb', title: 'Summer camp kickoff', aud: 'U-12, U-14', photos: 22, st: 'past' },
        ].map((e, i) => (
          <Card key={i} interactive tight>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: e.st === 'upcoming' ? 'var(--grad-soft)' : 'var(--surface-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: e.st === 'upcoming' ? '#A78BFA' : 'var(--text-2)' }}>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em' }}>{e.date.split(' ')[1].toUpperCase()}</div>
                <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{e.date.split(' ')[0]}</div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{e.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{e.aud}{e.photos ? ` · ${e.photos} photos` : ''}</div>
              </div>
              <Badge kind={e.st === 'upcoming' ? 'upcoming' : 'paid'}>{e.st}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  </Screen>
);

const OwnerExpensesScreen = () => (
  <Screen label="Owner · Expenses">
    <AppBar back title="Expenses" actions={<div className="icon-btn" style={{ background: 'var(--grad)', border: 'none' }}><Icon name="plus" size={16} color="white" /></div>} />
    <div className="af-content">
      <div style={{ padding: '4px 16px 0' }}>
        <Card>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>April total</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 2, letterSpacing: '-0.03em' }}>₹48,620</div>
          {/* stacked bar */}
          <div style={{ height: 8, display: 'flex', borderRadius: 4, overflow: 'hidden', marginTop: 12 }}>
            <div style={{ flex: 3.2, background: '#7C3AED' }} />
            <div style={{ flex: 1.8, background: '#3B82F6' }} />
            <div style={{ flex: 1.2, background: '#06B6D4' }} />
            <div style={{ flex: 0.8, background: '#10B981' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap', fontSize: 11 }}>
            {[['Rent','#7C3AED','22k'],['Salary','#3B82F6','12k'],['Equipment','#06B6D4','8.6k'],['Misc','#10B981','6k']].map(([l,c,v])=>(
              <div key={l} style={{ display:'flex', gap:5, alignItems:'center' }}>
                <div style={{ width:8, height:8, borderRadius:2, background:c }} />
                <span style={{ color:'var(--text-3)' }}>{l}</span>
                <span style={{ fontWeight:600 }}>₹{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 8, overflowX: 'auto' }}>
        <Chip active>All</Chip><Chip>Rent</Chip><Chip>Salaries</Chip><Chip>Equipment</Chip><Chip>Utilities</Chip>
      </div>
      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { cat: 'Rent', note: 'April rent · Ground 1 & 2', amt: '22,000', date: '1 Apr', icon: 'building' },
          { cat: 'Salary', note: 'Coach Rahul · March payout', amt: '12,000', date: '31 Mar', icon: 'user' },
          { cat: 'Equipment', note: 'Cricket kits · SG sports', amt: '8,620', date: '18 Apr', icon: 'book' },
          { cat: 'Utilities', note: 'Water bill', amt: '4,200', date: '12 Apr', icon: 'sparkle' },
          { cat: 'Misc', note: 'Tea & refreshments', amt: '1,800', date: '5 Apr', icon: 'gift' },
        ].map((e, i) => (
          <Card key={i} tight interactive>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A78BFA' }}><Icon name={e.icon} size={16} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{e.note}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{e.cat} · {e.date}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>₹{e.amt}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  </Screen>
);

const OwnerEnquiriesScreen = () => (
  <Screen label="Owner · Enquiries">
    <AppBar back title="Enquiries" actions={<div className="icon-btn" style={{ background: 'var(--grad)', border: 'none' }}><Icon name="plus" size={16} color="white" /></div>} />
    <div className="af-content">
      <div style={{ padding: '4px 16px 0' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {[['23','Open','#FBBF24'],['18','Follow-up','#60A5FA'],['6','Converted','#34D399'],['4','Lost','#F87171']].map(([n,l,c],i)=>(
              <div key={i} style={{ flex:1, textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:700, color:c, letterSpacing:'-0.02em' }}>{n}</div>
                <div style={{ fontSize:10, color:'var(--text-3)' }}>{l}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 8 }}>
        <Chip active>Open</Chip><Chip>Follow-up</Chip><Chip>All</Chip>
      </div>
      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { n: 'Neha Pillai', for: 'Daughter · 8y', intent: 'Jr. Swimming', when: '2h ago', phone: '98x xxx 0124', stage: 'New' },
          { n: 'Karan Shah', for: 'Son · 11y', intent: 'Cricket U-12', when: 'Yesterday', phone: '98x xxx 0841', stage: 'Follow-up' },
          { n: 'Asma Rao', for: 'Son · 14y', intent: 'Football A', when: '2d ago', phone: '98x xxx 1109', stage: 'Follow-up' },
        ].map((e, i) => (
          <Card key={i} tight interactive>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Avatar name={e.n} />
              <div style={{ flex: 1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{e.n}</div>
                  <span style={{ fontSize:11, color:'var(--text-3)' }}>· {e.when}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{e.for} · {e.intent}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4, fontFamily: 'ui-monospace, monospace' }}>{e.phone}</div>
              </div>
              <Badge kind={e.stage === 'New' ? 'pending' : 'upcoming'}>{e.stage}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  </Screen>
);

Object.assign(window, {
  SplashScreen, ForceUpdateScreen, SubscriptionBlockedScreen,
  SessionExpiredScreen, ErrorBoundaryScreen, OfflineBannerScreen,
  PermissionGateScreen, CreateStudentScreen, InviteParentSheet,
  OwnerEventsScreen, OwnerExpensesScreen, OwnerEnquiriesScreen,
});
