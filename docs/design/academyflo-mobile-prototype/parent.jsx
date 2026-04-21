// parent.jsx — Parent portal screens

const PARENT_TABS = [
  { key: 'children', label: 'Children', icon: 'users' },
  { key: 'fees', label: 'Fees', icon: 'wallet' },
  { key: 'events', label: 'Events', icon: 'calendar' },
  { key: 'more', label: 'More', icon: 'grid' },
];

const ParentChildren = ({ onTab, onOpen }) => {
  const kids = [
    { name: 'Aarav Mehta', batch: 'U-12 Cricket', att: 92, fee: 'paid', grad: 'linear-gradient(135deg,#EC4899,#8B5CF6)' },
    { name: 'Anika Mehta', batch: 'Jr. Swimming', att: 78, fee: 'due', grad: 'linear-gradient(135deg,#06B6D4,#3B82F6)' },
  ];
  return (
    <Screen label="Parent · Children">
      <AppBar large title="My children" actions={<div className="icon-btn"><Icon name="bell" size={18} /></div>} />
      <div className="af-content">
        <div style={{ padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {kids.map((k, i) => (
            <Card key={i} interactive onClick={onOpen} style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 16px 14px', background: k.grad, position: 'relative' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <Avatar name={k.name} size="lg" gradient="rgba(0,0,0,0.2)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>{k.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{k.batch}</div>
                  </div>
                  <Icon name="chevR" size={18} color="rgba(255,255,255,0.7)" />
                </div>
              </div>
              <div style={{ display: 'flex' }}>
                <div style={{ flex: 1, padding: '14px 16px', borderRight: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>Attendance</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: k.att > 85 ? '#34D399' : '#FBBF24', letterSpacing: '-0.02em' }}>{k.att}%</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>this month</span>
                  </div>
                </div>
                <div style={{ flex: 1, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>April fees</div>
                  <Badge kind={k.fee}>{k.fee === 'paid' ? 'Paid' : '₹2,800 due'}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="af-section-hdr"><div className="hdr">Upcoming</div></div>
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Card tight>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--grad-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#A78BFA' }}>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em' }}>APR</div>
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>26</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Parent-coach meeting</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Saturday · 10:00 AM</div>
              </div>
            </div>
          </Card>
          <Card tight>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(236,72,153,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#F472B6' }}>
                <Icon name="gift" size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Aarav's birthday</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>12 June · Thursday</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <TabBar tabs={PARENT_TABS} active="children" onTab={onTab} />
    </Screen>
  );
};

const ParentFees = ({ onTab, onPay }) => (
  <Screen label="Parent · Fees">
    <AppBar large title="Fees" actions={<div className="icon-btn"><Icon name="doc" size={18} /></div>} />
    <div className="af-content">
      <div style={{ padding: '4px 16px 0' }}>
        <Card style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.16), rgba(245,158,11,0.08))', borderColor: 'rgba(239,68,68,0.3)' }}>
          <div style={{ fontSize: 12, color: '#FCA5A5', fontWeight: 500 }}>Total due</div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 4 }}>{'₹2,800'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Across 1 child · due in 4 days</div>
          <Button block size="lg" onClick={onPay} style={{ marginTop: 14 }}>Pay now</Button>
        </Card>
      </div>

      <div className="af-section-hdr"><div className="hdr">By child</div></div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Card>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <Avatar name="Anika Mehta" gradient="linear-gradient(135deg,#06B6D4,#3B82F6)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Anika Mehta</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Jr. Swimming</div>
            </div>
          </div>
          <div style={{ background: 'var(--surface-3)', borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-2)' }}>April 2026 fee</span>
              <span style={{ fontWeight: 600 }}>₹2,800</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6, color: 'var(--text-3)' }}>
              <span>Due date</span><span>25 April</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4, color: 'var(--text-3)' }}>
              <span>Convenience fee</span><span>+₹24</span>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <Avatar name="Aarav Mehta" gradient="linear-gradient(135deg,#EC4899,#8B5CF6)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Aarav Mehta</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>U-12 Cricket</div>
            </div>
            <Badge kind="paid">Paid</Badge>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Paid ₹3,500 on 3 April · Receipt #AF-RCP-00482</div>
        </Card>
      </div>

      <div className="af-section-hdr"><div className="hdr">Recent payments</div><span className="link">See all</span></div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { m: 'March 2026', amt: '₹6,300', when: '3 Mar', rcp: '00321' },
          { m: 'February 2026', amt: '₹6,300', when: '2 Feb', rcp: '00219' },
        ].map((p, i) => (
          <Card key={i} tight interactive>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399' }}><Icon name="checkCircle" size={18} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.m}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Paid on {p.when} · #{p.rcp}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{p.amt}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
    <TabBar tabs={PARENT_TABS} active="fees" onTab={onTab} />
  </Screen>
);

const ParentPayFlow = ({ onBack, stage, onNext }) => {
  if (stage === 'polling') {
    return (
      <Screen label="Parent · Payment polling">
        <AppBar back onBack={onBack} title="" />
        <div className="af-content" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 24 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--grad-soft)', animation: 'afspin 2s linear infinite' }} />
            <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LoadSpinner size={48} color="#A78BFA" />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Confirming payment</div>
          <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 8, maxWidth: 280, lineHeight: 1.5 }}>We're waiting for your bank to confirm. This usually takes a few seconds — don't close the app.</div>
          <div style={{ marginTop: 24, display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--text-4)' }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: '#10B981', animation: 'afspin 1.2s linear infinite' }} />
            Checking in 3s · retry 2 of 5
          </div>
          <Button variant="tertiary" size="sm" onClick={onNext} style={{ marginTop: 40 }}>Simulate success →</Button>
        </div>
      </Screen>
    );
  }
  return (
    <Screen label="Parent · Payment success">
      <AppBar back onBack={onBack} title="" />
      <div className="af-content" style={{ padding: '24px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 96, height: 96, borderRadius: 28, background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 16px 48px -12px rgba(124,58,237,0.5)' }}>
          <Icon name="check" size={56} color="white" strokeWidth={2.8} />
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 20, letterSpacing: '-0.03em' }}>Payment successful</div>
        <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 6 }}>₹2,824 paid for Anika Mehta</div>

        <Card style={{ width: '100%', marginTop: 28, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Receipt</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>#AF-RCP-00489</div>
          </div>
          {[
            ['Child', 'Anika Mehta'],
            ['Batch', 'Jr. Swimming'],
            ['Period', 'April 2026'],
            ['Amount', '₹2,800'],
            ['Convenience', '₹24'],
            ['Paid on', '21 Apr 2026, 11:14 AM'],
            ['Method', 'UPI · ****@okhdfc'],
          ].map(([k, v], i, arr) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, marginTop: 4, borderTop: '1px dashed var(--border-strong)' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>₹2,824</span>
          </div>
        </Card>

        <div style={{ width: '100%', display: 'flex', gap: 8, marginTop: 20 }}>
          <Button block variant="secondary" icon="download">PDF</Button>
          <Button block variant="secondary" icon="share">Share</Button>
        </div>
        <Button block onClick={onBack} style={{ marginTop: 10, width: '100%' }}>Done</Button>
      </div>
    </Screen>
  );
};

const ParentEvents = ({ onTab }) => (
  <Screen label="Parent · Events">
    <AppBar large title="Events" />
    <div className="af-content">
      <div style={{ padding: '4px 16px 0', display: 'flex', gap: 8 }}>
        <Chip active>Upcoming · 4</Chip>
        <Chip>Past</Chip>
        <Chip>Gallery</Chip>
      </div>
      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { date: 'Apr 26', day: 'Sat', title: 'Parent-coach meeting', tag: 'All batches', time: '10:00 AM', col: 'linear-gradient(135deg,#7C3AED,#3B82F6)' },
          { date: 'May 04', day: 'Sun', title: 'Summer trials · U-14 Cricket', tag: 'U-12, U-14', time: '6:30 AM', col: 'linear-gradient(135deg,#10B981,#06B6D4)' },
          { date: 'May 18', day: 'Sun', title: 'Inter-academy tournament', tag: 'All', time: 'All day', col: 'linear-gradient(135deg,#F97316,#EC4899)' },
        ].map((e, i) => (
          <Card key={i} interactive style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ height: 100, background: e.col, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', padding: '6px 10px', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.8 }}>{e.day}</div>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>{e.date}</div>
              </div>
              {/* stripe pattern */}
              <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, transparent, transparent 14px, rgba(255,255,255,0.04) 14px, rgba(255,255,255,0.04) 15px)' }} />
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{e.title}</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12, color: 'var(--text-3)' }}>
                <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}><Icon name="clock" size={12} />{e.time}</span>
                <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}><Icon name="users" size={12} />{e.tag}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
    <TabBar tabs={PARENT_TABS} active="events" onTab={onTab} />
  </Screen>
);

const ParentMore = ({ onTab }) => (
  <Screen label="Parent · More">
    <AppBar large title="More" />
    <div className="af-content">
      <div style={{ padding: '4px 16px 0' }}>
        <Card>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar name="Rohit Mehta" size="lg" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Rohit Mehta</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>+91 98765 43210</div>
            </div>
            <Button size="sm" variant="secondary" icon="edit">Edit</Button>
          </div>
        </Card>
      </div>

      <div className="af-section-hdr"><div className="hdr">Academy</div></div>
      <div style={{ padding: '0 16px' }}>
        <Card>
          <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'center' }}>
            <Avatar name="Sunrise" size="sm" gradient="linear-gradient(135deg,#F97316,#EC4899)" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Sunrise Sports Academy</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Indiranagar, Bengaluru</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="secondary" icon="phone" block>Call</Button>
            <Button size="sm" variant="secondary" icon="pin" block>Directions</Button>
          </div>
        </Card>
      </div>

      <div className="af-section-hdr"><div className="hdr">Account</div></div>
      <div style={{ padding: '0 16px' }}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {[
            { icon: 'lock', label: 'Change password' },
            { icon: 'bell', label: 'Notification preferences' },
            { icon: 'info', label: 'Support & help' },
            { icon: 'doc', label: 'Terms & privacy' },
            { icon: 'trash', label: 'Delete account', danger: true },
          ].map((r, i, arr) => (
            <div key={i} className="af-row" style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: r.danger ? 'rgba(239,68,68,0.12)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: r.danger ? '#F87171' : 'var(--text-2)' }}><Icon name={r.icon} size={16} /></div>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: r.danger ? '#F87171' : 'var(--text-1)' }}>{r.label}</div>
              <Icon name="chevR" size={14} color="var(--text-4)" />
            </div>
          ))}
        </Card>
      </div>
      <div style={{ padding: 16 }}>
        <Button block variant="secondary" icon="logout">Sign out</Button>
      </div>
    </div>
    <TabBar tabs={PARENT_TABS} active="more" onTab={onTab} />
  </Screen>
);

Object.assign(window, {
  ParentChildren, ParentFees, ParentPayFlow, ParentEvents, ParentMore, PARENT_TABS,
});
