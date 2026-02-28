# BERAMETHODE — Antigravity Project Rules
# READ THIS FILE FIRST in every new conversation before touching any code.

## 🏭 Project Identity
- **Name**: BERAMETHODE (MBERATEX Cost Calculator)
- **Owner**: Soulaimane Berraadi (user initials: SB)
- **Purpose**: Garment/textile industry workflow management tool — covers the full production chain from technical spec sheet to cost analysis
- **Language in app**: Primarily **French** (labels, UI text). Arabic (`lang='ar'`) toggle was added to the header in Feb 2026.
- **Project root**: `c:\Users\HP\Downloads\BRAMETHOOOD\`

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | **Tailwind CSS** (used heavily via className strings) |
| Backend | **Express 5** + Node.js via `tsx` (TypeScript runner) |
| Database | **better-sqlite3** (SQLite, file: `src/database.sqlite`) |
| Auth | JWT (jsonwebtoken) + bcryptjs + cookie-parser |
| AI | @google/genai (Gemini API) |
| Email | nodemailer |
| Charts | recharts |
| Animations | framer-motion |
| Icons | lucide-react |

### Run command (ALWAYS from project root):
```
cmd /c "cd /d c:\Users\HP\Downloads\BRAMETHOOOD && npx tsx server.ts"
```
> ⚠️ Must run from root (`BRAMETHOOOD/`), NOT from `src/`. The Vite server needs `index.html` at root.
> Port: **7000**

---

## 📁 File Structure

```
BRAMETHOOOD/
├── App.tsx                  ← ROOT: Main app, global state, header, routing
├── index.html               ← Vite entry point (MUST exist at root)
├── index.tsx                ← React entry (renders <App />)
├── types.ts                 ← ALL TypeScript types (single source of truth)
├── utils.ts                 ← Shared utility functions
├── server.ts                ← Express + Vite middleware server (port 7000)
├── vite.config.ts           ← Vite config (@/ alias = project root)
├── tsconfig.json
├── metadata.json            ← App metadata
│
├── components/              ← All React UI components (24 files)
│   ├── ModelWorkflow.tsx    ← Workflow stepper (wraps all 6 steps)
│   ├── FicheTechnique.tsx   ← Step 1: Technical spec sheet
│   ├── Gamme.tsx            ← Step 2: Operation sequence (biggest file, ~104KB)
│   ├── AnalyseTechnologique.tsx ← Step 3: Technical analysis
│   ├── Balancing.tsx        ← Step 4: Work balancing (~59KB)
│   ├── Implantation.tsx     ← Step 5: Workshop floor layout (~173KB — BIGGEST)
│   ├── CostCalculator.tsx   ← Step 6: Cost & budget
│   ├── Library.tsx          ← Model library (saved projects)
│   ├── Machin.tsx           ← Machine & config management
│   ├── Profil.tsx           ← User profile
│   ├── Dashboard.tsx        ← Dashboard view
│   ├── A4DocumentView.tsx   ← PDF/print view
│   ├── PdfSettingsModal.tsx ← PDF export settings
│   ├── MaterialsList.tsx    ← Materials list
│   ├── ModelInfo.tsx        ← Model info display
│   ├── Info.tsx             ← Info/help panel
│   ├── OrderSimulation.tsx  ← Order simulation
│   ├── CostPartials.tsx     ← Cost calculation partials
│   ├── TicketView.tsx       ← Ticket/label view
│   ├── SettingsPanel.tsx    ← Settings panel
│   ├── Paramitre.tsx        ← Parameters
│   ├── ExcelInput.tsx       ← Excel import
│   └── Library.tsx          ← Model library
│
├── server/                  ← Backend controllers
│   ├── authController.ts    ← Register, login, logout, me, password reset
│   ├── userController.ts    ← Admin: list users, update role, delete
│   ├── modelController.ts   ← CRUD for saved models (cloud sync)
│   ├── middleware.ts        ← authenticateToken middleware
│   └── db.ts               ← SQLite DB initialization
│
├── src/                     ← Additional frontend files
│   ├── context/
│   │   └── AuthContext.tsx  ← Auth context (useAuth hook)
│   ├── components/
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   └── AdminDashboard.tsx
│   └── database.sqlite      ← SQLite file
│
└── services/
    └── gemini.ts            ← Gemini AI service
```

---

## 🗂️ Key Types (`types.ts`)

```ts
Machine      → { id, name, classe, speed, speedMajor, cofs, active }
Operation    → { id, order, description, machineId, time, predecessors?, ... }
Poste        → { id, name, machine, x?, y?, isPlaced?, rotation?, ... } (workstation)
FicheData    → { date, client, category, designation, quantity, costMinute, ... }
ModelData    → { id, meta_data, gamme_operatoire, implantation? } (saved model)
ManualLink   → { id, from, to, label? } (connection lines in Implantation)
Material     → { id, name, unitPrice, qty, unit, ... }
Guide        → { id, name, category, machineType, description, useCase }
```

---

## 🧭 App Navigation & State

### Views (in `App.tsx` — `currentView` state):
| View | Component | Description |
|------|-----------|-------------|
| `atelier` | `ModelWorkflow` | Main 6-step workflow |
| `library` | `Library` | Saved models |
| `config` | `Machin` | Machine & config settings |
| `profil` | `Profil` | User profile |
| `admin` | `AdminDashboard` | Admin only (role=admin) |

### 6-Step Workflow (in `ModelWorkflow.tsx`):
1. **Fiche Technique** (`fiche`) → FicheTechnique.tsx
2. **Gamme** (`gamme`) → Gamme.tsx
3. **Analyse** (`analyse`) → AnalyseTechnologique.tsx
4. **Équilibrage** (`equilibrage`) → Balancing.tsx
5. **Implantation** (`implantation`) → Implantation.tsx
6. **Coûts & Budget** (`couts`) → CostCalculator.tsx

---

## 💾 Data Persistence

### Auto-save (localStorage):
- **Key**: `beramethode_autosave_v1`
- Saves: `operations, assignments, postes, ficheData, ficheImages, efficiency, numWorkers, presenceTime, layoutMemory, activeLayout, savedPlantations`
- **Debounce**: 2 seconds after last change

### Library persistence:
- **Guest**: localStorage key `beramethode_library`
- **Logged in**: Server API `/api/models`

### Manual links (Implantation):
- **Key**: `beramethode_manual_links`

### History (Undo/Redo):
- Max 50 states, tracks `{ operations, assignments, postes }`
- `Ctrl+Z` = Undo, `Ctrl+Y` = Redo

---

## 🔐 Authentication

- **JWT** stored in cookies (httpOnly)
- **Guest mode** is allowed (isGuest=true skips login)
- Routes: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- Password reset: `/api/auth/forgot-password` → `/api/auth/verify-code` → `/api/auth/reset-password`
- Admin routes: `/api/users` (GET, PUT role, DELETE)
- User roles: `'user'` | `'admin'`

---

## 🏗️ Implantation Module (Special Notes)
> This is the most complex component (~173KB). Be careful when editing.

- **Layout types**: `'zigzag' | 'snake' | 'grid' | 'wheat' | 'free' | 'line'`
- **Auto Mode**: Automatically places workstations in selected layout
- **Free Mode**: Drag-and-drop canvas for manual placement
- **ManualLinks**: Connection lines between workstations (drawn with SVG)
  - Stored in localStorage key `beramethode_manual_links`
  - State lifted up to ModelWorkflow.tsx for persistence
- `layoutMemory`: Stores position memory per layout type

---

## 🌍 Bilingual Support (FR/AR)

Added February 2026. In `App.tsx`:
```ts
const [lang, setLang] = useState<'fr' | 'ar'>('fr');
const TRANSLATIONS = { fr: {...}, ar: {...} };
```
- Toggle button in header right: 🇩🇿 عربي / 🇫🇷 FR
- `dir="rtl"` applied to root `<div>` when Arabic
- `ModelWorkflow.tsx` also has `STEP_LABELS` for stepper translation
- `lang` prop passed from App → ModelWorkflow

---

## ⚙️ Global State Architecture

All state lives in `App.tsx` and is passed down as props:

```
App.tsx
├── machines[]            → Config: list of sewing machines
├── operations[]          → Core workflow data
├── assignments{}         → Record<posteId, operationId[]>
├── postes[]              → Workstation list
├── ficheData             → Technical sheet fields
├── ficheImages           → { front, back } base64 images
├── efficiency            → % (default 85)
├── numWorkers            → number
├── presenceTime          → minutes (default 480 = 8h)
├── layoutMemory          → positions per layout type
├── activeLayout          → current layout type
├── models[]              → Library of saved models
└── history[]             → Undo/redo history stack
```

**Derived stats** (`globalStats` — computed via `useMemo`):
```ts
totalTime    = sum of operation.time
tempsArticle = totalTime * 1.20
bf           = tempsArticle / (numWorkers * efficiency%)
```

---

## 🎨 UI Design System

- **Color palette**:
  - Emerald: primary actions, Atelier nav
  - Indigo: workflow steps, active states
  - Amber: config/settings
  - Purple: admin
  - Slate: neutral backgrounds
- **Font**: System sans-serif (no custom font import)
- **Header height**: `h-12` (48px), sticky top
- **Component pattern**: Tailwind utility classes throughout, no CSS modules

---

## 🚨 Known Issues & Important Notes

1. **PowerShell Execution Policy**: Running `npm run dev` may fail due to Windows policy. Always use `cmd /c` wrapper: `cmd /c "cd /d C:\...\BRAMETHOOOD && npx tsx server.ts"`
2. **Server must run from root**: NOT from `src/` — Vite needs `index.html` at root
3. **Implantation.tsx is huge** (~173KB): always read specific sections, never rewrite entirely
4. **Gamme.tsx is huge** (~104KB): same caution
5. **Category is mandatory** for saving a model (validated in `saveCurrentModel`)
6. **`vite.config.ts` alias**: `@/` resolves to project root

---

## 📋 Common Tasks & Where to Do Them

| Task | File |
|------|------|
| Change header UI | `App.tsx` (lines ~556-671) |
| Add workflow step | `ModelWorkflow.tsx` (steps array) |
| Change step content | Respective component (FicheTechnique, Gamme, etc.) |
| Add machine type | `App.tsx` DEFAULT_MACHINES array |
| Add API route | `server.ts` + new controller in `server/` |
| Add new type | `types.ts` |
| Change auth logic | `server/authController.ts` |
| Add to library | `Library.tsx` |
| Change autosave | `App.tsx` AUTO_SAVE_KEY effect |

---

## 💬 Communication Style (How the User Talks)

The owner **Soulaimane** communicates in a mix of:
- **Moroccan Darija** (Arabic dialect written in Latin characters) — primary language
- **French** words mixed in naturally
- Short, informal, direct messages — no long formal explanations

### Common phrases to understand:
| Darija | Meaning |
|--------|---------|
| `3mili` | Do for me / Make for me |
| `xof` / `shuuf` | Look / See |
| `mxi mxkila` / `mashi mushkila` | No problem |
| `wax` / `wash` | Can you? / Is it? |
| `dif` / `zid` | Add |
| `bdl` | Change |
| `t9dar` | Can you |
| `lmohm` | The important thing |
| `bx` / `bash` | So that / In order to |
| `mli` | When |
| `rir` | Just / Only |
| `hda` / `hadi` | This |
| `dyal` | Of / For |
| `fih` | In it |
| `knbghi` / `kanbghi` | I want |
| `tfhm` / `tfhmo` | You understand |
| `hhh` | Laughing (like haha) |

### Communication rules for Antigravity:
- **Respond exclusively in Standard Arabic (الفصحى)** as requested by the user.
- **Be concise** — user prefers short direct answers, not long paragraphs.
- **Understand intent** even with spelling variations or typos in the user's Darija/Arabic input.
- User often skips punctuation and uses phonetic spelling.

---

## 🧑‍💻 Working Style (How the User Works)

- **Iterative**: Makes small requests step by step, not big spec docs
- **Visual first**: Prefers seeing results in the browser immediately
- **Direct fixes**: Tells Antigravity exactly what to change, expects it to be done without too many questions
- **Test by running**: Always wants to see the app running at `localhost:7000` to verify
- **Prefers short confirmations**: After a task, just confirm what was done + what to do next — no long summaries
- **Working environment**:
  - OS: **Windows 11**
  - Shell: **PowerShell** (but use `cmd /c` for Node.js due to policy issues)
  - Editor: **VS Code** (files open in editor)
  - Node.js version: **v24.x**

---

## 📅 Project Changelog (تاريخ التحديثات)

> Add a new entry every time a significant change is made to the project.

### [2026-02-26]
- ✅ **Phase 24 & 26 Centralized Task Management System implemented**:
  - `AppTask` structure updated in `types.ts` (`PENDING`, `DONE_OK`, `DONE_NOT_OK`, `SKIPPED`).
  - Added "Mes Tâches" widget to `Dashboard.tsx` displaying overdue and current tasks.
  - Implemented Agenda modal interaction logic in `Configuration.tsx` for Admin assignment.
  - Automated task Rollover logic added directly in `App.tsx` upon load.
- ✅ **Phase 25 Implantation Layout UX/UI Enhancements implemented**:
  - "Emplacement Vide" slots are now draggable in free/auto modes within `Implantation.tsx`.
  - Added Magnetic Snap-to-Grid feature (40px) for free mode.
  - Smart Connection Lines (Circuit Board Routing) added replacing overlapping direct lines.
  - Layout Template History feature added (Save/Load to local storage) in Implantation toolbar.
  - Real-time Layout Machine Counter Widget added.

### [2026-02-23]
- ✅ **Arabic header support added** — bilingual FR/AR toggle button (🇩🇿 عربي / 🇫🇷 FR) in top-right header
  - `App.tsx`: `TRANSLATIONS` object, `lang` state, `dir="rtl"` on root div
  - `ModelWorkflow.tsx`: `STEP_LABELS` object, `lang` prop, all stepper labels translatable
- ✅ **Antigravity rules file created** — `.agent/rules.md` (this file)
- ✅ **Startup workflow created** — `.agent/workflows/startup.md`

### [2026-02-22]
- ✅ **Liaison (ManualLink) logic fixed** in `Implantation.tsx`
  - Connection lines persist via localStorage key `beramethode_manual_links`
  - State lifted up to `ModelWorkflow.tsx` for cross-render persistence
- ✅ **Zigzag layout refined** — "Horizontal Pairs" auto mode corrected
  - Pairs (P1/P2, P3/P4) correctly aligned without horizontal offsets
  - Column headers positioned correctly above their pairs

### [Before 2026-02-22]
- ✅ Full 6-step workflow implemented (Fiche → Gamme → Analyse → Équilibrage → Implantation → Coûts)
- ✅ Auto-save to localStorage (`beramethode_autosave_v1`)
- ✅ Library with cloud sync (logged-in users) + local (guests)
- ✅ Auth system: JWT + cookies, guest mode, password reset via email
- ✅ Admin dashboard for user management
- ✅ Multiple layout types for Implantation: zigzag, snake, grid, wheat, free, line
- ✅ Undo/Redo system (50 states max)
