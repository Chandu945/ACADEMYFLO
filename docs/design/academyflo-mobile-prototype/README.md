# Academyflo Mobile UI — Design Prototype

Interactive React-based mobile UI prototype covering all three portals (Owner,
Staff, Parent) plus authentication, system states, and a component library.

## Source

Exported from Claude Design (claude.ai/design) on 2026-04-21. This is the
**handoff bundle** — static HTML/JS/CSS, not production code. Treat as a
visual + behavioral reference when implementing screens in
`apps/mobile` (React Native).

## Running it

The prototype is a self-contained single-page React app loaded via CDN (React
18, Babel standalone). No build step.

```sh
# From repo root:
cd docs/design/academyflo-mobile-prototype
python3 -m http.server 8080
# then open http://localhost:8080/Academyflo.html
```

Opening `Academyflo.html` directly as `file://` works in most browsers but some
block inline `<script type="text/babel">` under that scheme — use a local
server if you see a blank page.

## What's in the canvas

Six horizontally-laid-out sections, zoomable/pannable:

| Section | Contents |
|---|---|
| **Foundation** | Component library sheet + splash |
| **Authentication** | Interactive welcome → login → OTP → new password → signup flow + static frames |
| **Owner portal** | ★ Interactive tab app + static frames for every major screen (Dashboard, Students, Student Detail, Create Student, Invite Parent sheet, Attendance, Fees, Events, Expenses, Enquiries, More) |
| **Staff portal** | Interactive dashboard + permission-gate example |
| **Parent portal** | ★ Interactive with working Pay-now → Cashfree polling → receipt flow |
| **System states** | Force update, subscription blocked, session expired, error boundary, offline banner |

The ★ artboards are live — tap buttons, tabs, rows. The rest are static frames
showing specific screens in one state.

## Design tokens

All color / type / spacing tokens live in `tokens.css` as CSS custom
properties. Key values:

- Background: `#05070D` (bg), `#0A0E1A` (bg-2)
- Surfaces: `#0F1422` / `#141824` / `#1C2233`
- Accent gradient: `#7C3AED → #3B82F6`
- Success/warn/danger/info: `#10B981 / #F59E0B / #EF4444 / #06B6D4`
- Type: Inter, 8pt grid
- Card borders: 1px inner stroke at 6–10% white

When porting, import these into `apps/mobile/src/presentation/theme` (or
equivalent) so RN components reference the same values.

## File layout

```
Academyflo.html           entry — wires everything together via <script> tags
tokens.css                design tokens (colors, font family)
design-canvas.jsx         zoomable canvas host + section/artboard primitives
ios-frame.jsx             iOS device shell (status bar, home indicator, keyboard)
primitives.jsx            icons, buttons, badges, chips, cards, nav, tabs
components-sheet.jsx      component library artboard
auth.jsx                  welcome / login / OTP / new password / signup screens
owner.jsx                 owner portal screens
staff.jsx                 staff portal screens
parent.jsx                parent portal screens
extras.jsx                system-state screens + sheets (invite-parent, etc.)
```

All `.jsx` files are loaded in global scope via `<script type="text/babel">` —
functions defined in one file are directly callable from another without
imports. This is a prototype convention; when porting, convert to explicit
imports.

## Porting guidance for React Native

- **Not a 1:1 port**. The prototype uses HTML/CSS primitives. In RN, map:
  - `<div>` → `<View>`
  - CSS gradients → `react-native-linear-gradient`
  - Inter font → ensure it's bundled or fall back to system
  - iOS frame mock → remove entirely (real device is the frame)
- **Keep the token names**. Port `tokens.css` values into a TS module so the
  RN theme references identical hex codes.
- **Component sheet is the source of truth** for button / input / card variants.
  Build these first in RN, then compose screens from them.
- **★ Interactive artboards** encode the intended navigation behavior. When
  building screens in RN, match the state transitions shown there (tab index,
  modal open/close, optimistic updates).
- **Payment polling flow** (parent portal) shows the exponential backoff UX —
  match the visual cadence when wiring the mobile client to
  `handle-fee-payment-webhook` results.

## Out of scope (for this handoff)

The original design brief asked for every screen × every state (empty /
loading / error / rate-limited / offline) × every portal. The prototype ships
the core navigable flows + representative screens. When porting, regenerate
state variants per the written spec in the design brief rather than extracting
them from this prototype — the prototype only shows the default/success path
for most screens.

## License

Internal design artifact. Do not redistribute outside the team.
