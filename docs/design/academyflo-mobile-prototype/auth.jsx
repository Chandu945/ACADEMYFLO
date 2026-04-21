// auth.jsx — Authentication flow screens

const AuthWelcome = ({ onLogin, onSignup }) => (
  <Screen label="Auth · Welcome">
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 24px 40px', position: 'relative', overflow: 'hidden' }}>
      {/* gradient orb bg */}
      <div style={{ position: 'absolute', top: -120, left: -80, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.4), transparent 70%)', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', bottom: 80, right: -100, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.3), transparent 70%)', filter: 'blur(40px)' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 16px 48px -12px rgba(124,58,237,0.6)' }}>
          <svg width="38" height="38" viewBox="0 0 32 32" fill="none"><path d="M16 4 4 10v8c0 6 5 10 12 10s12-4 12-10v-8L16 4z" stroke="white" strokeWidth="2.2" strokeLinejoin="round"/><path d="m10 14 6 4 6-4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.02 }}>Academy<span className="af-grad-text">flo</span></div>
        <div style={{ fontSize: 16, color: 'var(--text-2)', marginTop: 12, lineHeight: 1.5, maxWidth: 300 }}>The operating system for coaching institutes, sports academies, and after-school programs.</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 32, position: 'relative' }}>
        <Button block size="lg" onClick={onLogin}>Log in</Button>
        <Button block size="lg" variant="secondary" onClick={onSignup}>Create academy</Button>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-4)', marginTop: 14 }}>
          By continuing you agree to our <span style={{ color: 'var(--text-2)' }}>Terms</span> and <span style={{ color: 'var(--text-2)' }}>Privacy</span>
        </div>
      </div>
    </div>
  </Screen>
);

const AuthLogin = ({ onBack, onSubmit, onForgot }) => {
  const [showPw, setShowPw] = React.useState(false);
  return (
    <Screen label="Auth · Login">
      <AppBar back onBack={onBack} title="" />
      <div className="af-content" style={{ padding: '8px 24px 24px' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6 }}>Welcome back</div>
        <div style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 28 }}>Log in to your Academyflo account</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="af-field">
            <label>Email or phone</label>
            <input className="af-input" defaultValue="priya@sunrisesports.in" />
          </div>
          <div className="af-field">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input className="af-input" type={showPw ? 'text' : 'password'} defaultValue="••••••••••" />
              <div style={{ position: 'absolute', right: 10, top: 10, padding: 8, cursor: 'pointer', color: 'var(--text-3)' }} onClick={() => setShowPw(!showPw)}>
                <Icon name={showPw ? 'eye' : 'eyeOff'} size={18} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }} onClick={onForgot}>Forgot password?</span>
          </div>
          <Button block onClick={onSubmit} size="lg">Log in</Button>
        </div>

        {/* rate-limit cooldown example */}
        <Card style={{ marginTop: 20, background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Icon name="clock" size={20} color="#FBBF24" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#FBBF24', marginBottom: 2 }}>Too many attempts</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Try again in 00:42</div>
            </div>
          </div>
        </Card>
      </div>
    </Screen>
  );
};

const AuthOTP = ({ onBack, onVerify }) => {
  const [code, setCode] = React.useState(['4', '7', '2', '', '', '']);
  const refs = React.useRef([]);
  return (
    <Screen label="Auth · OTP">
      <AppBar back onBack={onBack} title="" />
      <div className="af-content" style={{ padding: '8px 24px 24px' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6 }}>Check your email</div>
        <div style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 36 }}>We sent a 6-digit code to <span style={{ color: 'var(--text-1)' }}>priya@sunrisesports.in</span></div>

        <div className="af-otp">
          {code.map((d, i) => (
            <input key={i} ref={el => refs.current[i] = el} maxLength={1} value={d} onChange={(e) => {
              const next = [...code]; next[i] = e.target.value.slice(-1); setCode(next);
              if (e.target.value && i < 5) refs.current[i + 1]?.focus();
            }} />
          ))}
        </div>

        <div style={{ marginTop: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          Didn't receive? <span style={{ color: 'var(--text-4)' }}>Resend in 0:24</span>
        </div>

        <Button block size="lg" onClick={onVerify} style={{ marginTop: 32 }}>Verify & continue</Button>
      </div>
    </Screen>
  );
};

const AuthNewPassword = ({ onBack, onDone }) => {
  const [pw, setPw] = React.useState('Sec$');
  const strength = Math.min(4, Math.floor(pw.length / 3));
  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const colors = ['#EF4444', '#F59E0B', '#06B6D4', '#10B981', '#10B981'];
  return (
    <Screen label="Auth · New password">
      <AppBar back onBack={onBack} title="" />
      <div className="af-content" style={{ padding: '8px 24px 24px' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6 }}>Set a new password</div>
        <div style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 28 }}>Make it at least 8 characters with a mix of letters, numbers, and symbols.</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="af-field">
            <label>New password</label>
            <input className="af-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < strength ? colors[strength - 1] : 'var(--surface-3)' }} />
              ))}
            </div>
            <div style={{ fontSize: 12, color: colors[Math.max(0, strength - 1)], fontWeight: 500 }}>{labels[Math.max(0, strength - 1)]} password</div>
          </div>
          <div className="af-field">
            <label>Confirm password</label>
            <input className="af-input" type="password" />
          </div>
          <Button block onClick={onDone} size="lg" style={{ marginTop: 8 }}>Reset password</Button>
        </div>
      </div>
    </Screen>
  );
};

const AuthSignup = ({ step = 1, onBack, onNext }) => {
  if (step === 3) {
    return (
      <Screen label="Auth · Signup success">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 24px 40px', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 30%, rgba(124,58,237,0.3), transparent 60%)' }} />
          <div style={{ position: 'relative', width: 120, height: 120, borderRadius: 36, background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 24px 64px -12px rgba(124,58,237,0.6)' }}>
            <Icon name="check" size={64} color="white" strokeWidth={2.5} />
          </div>
          <div style={{ position: 'relative', fontSize: 28, fontWeight: 700, marginTop: 32, letterSpacing: '-0.03em' }}>Your academy is ready</div>
          <div style={{ position: 'relative', color: 'var(--text-3)', fontSize: 15, marginTop: 8, maxWidth: 280, lineHeight: 1.5 }}>Sunrise Sports Academy is set up with a 14-day trial. Let's get your first batch in.</div>
          <div style={{ position: 'relative', marginTop: 40, width: '100%' }}>
            <Button block size="lg" onClick={onNext}>Go to dashboard</Button>
          </div>
        </div>
      </Screen>
    );
  }
  return (
    <Screen label={`Auth · Signup ${step}`}>
      <AppBar back onBack={onBack} title="" actions={<span style={{ fontSize: 13, color: 'var(--text-3)' }}>Step {step}/2</span>} />
      <div className="af-content" style={{ padding: '8px 24px 24px' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 28 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--grad)' }} />
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: step === 2 ? 'var(--grad)' : 'var(--surface-3)' }} />
        </div>
        {step === 1 ? (
          <>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6 }}>Your details</div>
            <div style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 24 }}>This will be your owner account.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="af-field"><label>Full name</label><input className="af-input" defaultValue="Priya Venkatesh" /></div>
              <div className="af-field"><label>Email</label><input className="af-input" defaultValue="priya@sunrisesports.in" /></div>
              <div className="af-field"><label>Phone</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div className="af-input" style={{ width: 86, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <span>🇮🇳</span><span>+91</span>
                  </div>
                  <input className="af-input" style={{ flex: 1 }} defaultValue="98456 31204" />
                </div>
              </div>
              <div className="af-field"><label>Password</label><input className="af-input" type="password" defaultValue="••••••••" /></div>
              <Button block size="lg" onClick={onNext} style={{ marginTop: 8 }}>Continue</Button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6 }}>Academy setup</div>
            <div style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 24 }}>Tell us about your academy.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="af-field"><label>Academy name</label><input className="af-input" defaultValue="Sunrise Sports Academy" /></div>
              <div className="af-field"><label>Type</label>
                <div className="af-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Sports Academy</span><Icon name="chevD" size={16} color="var(--text-3)" />
                </div>
              </div>
              <div className="af-field"><label>Address</label><textarea className="af-textarea" defaultValue="128, 4th Cross, Indiranagar, Bengaluru 560038" /></div>
              <div className="af-field"><label>Logo (optional)</label>
                <div className="af-input" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-3)' }}>
                  <Icon name="upload" size={18} /><span>Upload PNG or JPG</span>
                </div>
              </div>
              <Button block size="lg" onClick={onNext} style={{ marginTop: 8 }}>Create academy</Button>
            </div>
          </>
        )}
      </div>
    </Screen>
  );
};

Object.assign(window, { AuthWelcome, AuthLogin, AuthOTP, AuthNewPassword, AuthSignup });
