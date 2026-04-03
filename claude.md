# ExpenseTracker — Claude Code Guide

## Project Overview

A premium, mobile-first Progressive Web App for personal expense tracking. Designed with a fintech-grade dark UI aesthetic inspired by Apple's design language. Built as a **personal project / portfolio piece** — there are no tests, CI, or staging environments.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 5 (dev: `npm run dev`, build: `npm run build`) |
| Styling | TailwindCSS 3 (class-based dark mode) + CSS custom properties in `src/index.css` |
| Backend | Firebase (Auth, Firestore, Analytics) — no custom backend server |
| AI | Google Gemini API via `@google/generative-ai` (`src/services/gemini.ts`) |
| Animation | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| PWA | vite-plugin-pwa with Workbox |

## Architecture

```
src/
├── App.tsx              # Router setup: ThemeProvider → AuthProvider → Routes
├── pages/               # Full-screen route components (Home, History, Analytics, Profile, Chat, EventDetail, Admin, Login)
├── components/          # Shared UI components
│   └── ui/              # Low-level primitives (LiquidGlass navbar, FAB, spinners)
├── context/             # React Context providers
│   ├── AuthContext.tsx   # Firebase Auth (Google sign-in), exposes `user`
│   ├── ThemeContext.tsx  # Light/dark/system theme + accent color (HSL-based)
│   └── GlobalModalContext.tsx  # Global "Add Expense" modal state
├── hooks/               # Custom hooks — core business logic lives here
│   ├── useExpenses.ts   # CRUD for expenses + Firestore aggregation sync
│   ├── useEvents.ts     # Event (trip/occasion) management
│   ├── useAiInsights.ts # Gemini-powered spending insights
│   └── useChatHistory.ts
├── services/
│   └── gemini.ts        # Gemini API integration (prompts, parsing, chat)
├── types/
│   └── index.ts         # Expense, Event, User, Theme, AuthContextType interfaces
└── utils/               # Pure utility functions
    ├── insights.ts      # Spending pattern analysis
    ├── reportGenerator.ts # PDF export (jspdf + jspdf-autotable)
    ├── analyticsHelpers.ts
    ├── formatUtils.ts
    ├── indexedDB.ts     # Offline cache
    ├── uiUtils.tsx
    └── notificationUtils.ts
```

## Firestore Data Model

All user data lives under `users/{uid}/` as subcollections:

- **`expenses/{expenseId}`** — Individual transactions. Fields: `amount`, `category`, `date`, `note`, `context` (personal|event), `contextId`.
- **`events/{eventId}`** — Trip/occasion groupings with `name`, `startDate`, `endDate`, `budget`.
- **`stats/{monthKey}`** — Pre-aggregated monthly totals (kept in sync with expenses via transactional increments in `useExpenses.ts`). This is a **dual-collection pattern** — changes to expenses must update the corresponding stats doc atomically.
- **`chats/{chatId}`** — AI chat history.

> **CRITICAL**: When modifying expense CRUD logic in `useExpenses.ts`, always maintain the transactional sync between the `expenses` and `stats` subcollections. Failing to do so will cause data inconsistencies between the Home page (reads `stats`) and Analytics/History pages (reads `expenses`).

## Design System

### Theming
- Dark mode uses the `class` strategy (`dark` class on `<html>`)
- All colors are **CSS custom properties** defined as raw HSL values in `src/index.css` (`:root` for light, `.dark` for dark)
- Tailwind consumes them via `hsl(var(--token) / <alpha-value>)` syntax in `tailwind.config.js`
- Accent color is dynamic (user-selectable), stored as HSL components (`--accent-h`, `--accent-s`, `--accent-l`) in `ThemeContext.tsx`

### Key Tailwind Tokens
- Backgrounds: `bg-body`, `bg-surface`, `bg-elevated`
- Text: `text-primary`, `text-secondary`, `text-tertiary`
- Border: `border-subtle`
- Accent: `accent` / `accent-hover`

### Glass Morphism Utilities
Defined in `src/index.css` `@layer utilities`:
- `.glass` — Strong blur, semi-transparent
- `.glass-card` — Card-level glass effect
- `.glass-nav` — Navigation bar glass

### UI Components (`src/components/ui/`)
- `LiquidGlass.css` — Advanced glassmorphism effects
- `LiquidNavBar.tsx` — Bottom navigation bar with fluid animations
- `LiquidFAB.tsx` — Floating action button
- `LiquidBack.tsx` / `LiquidClose.tsx` — Navigation buttons

### Animation
- Framer Motion for page transitions, gesture interactions (swipe-to-delete in `SwipeableExpenseItem.tsx`), and micro-animations
- Custom CSS keyframes in `index.css`: `slide-up-fade`, `pulse-soft`, `glow-pulse-green/red`, `spinner-fade`
- Tailwind keyframes in `tailwind.config.js`: `slide-up`, `fade-in`, `scale-in`, `float`, `subtle-glow`

## Key Conventions

1. **Mobile-first**: The app is designed exclusively for mobile viewports. All layouts assume portrait phone screens with iOS safe areas (`env(safe-area-inset-*)`, `pt-safe`, `pb-safe`).
2. **No tests**: This is a personal project. There is no test infrastructure.
3. **TypeScript strict mode**: `tsconfig.json` has `strict: true`, `noUnusedLocals`, `noUnusedParameters` enabled.
4. **Utility function for className merging**: Use `clsx` + `tailwind-merge` for conditional class composition (imported from respective packages).
5. **Static imports only**: All page components are statically imported in `App.tsx` (no lazy loading).
6. **Firebase config**: Lives in `.env` (gitignored). Firebase project config is in `firebase.json` / `.firebaserc`.
7. **Bundle splitting**: Vite manual chunks configured in `vite.config.ts` — vendor, firebase, ui, charts.

## Routes

| Path | Page | Auth Required |
|---|---|---|
| `/login` | Login | No |
| `/` | Home | Yes |
| `/history` | History | Yes |
| `/analytics` | Analytics | Yes |
| `/profile` | Profile | Yes |
| `/event/:eventId` | EventDetail | Yes |
| `/chat` | Chat | Yes |
| `/admin` | Admin | Yes |

## Common Patterns

### Adding a new expense field
1. Add the field to the `Expense` interface in `src/types/index.ts`
2. Update the form in `src/components/GlobalAddExpense.tsx`
3. Update CRUD operations in `src/hooks/useExpenses.ts`
4. If it affects aggregations, update stats sync logic in the same hook

### Modifying theme / colors
1. Update CSS custom properties in `src/index.css` (both `:root` and `.dark`)
2. If adding a new semantic token, also add it to `tailwind.config.js` `theme.extend.colors`

### Working with Gemini AI
- All Gemini logic is in `src/services/gemini.ts`
- The API key comes from the `.env` file
- Insights are generated in `src/hooks/useAiInsights.ts`
- Chat functionality is in `src/pages/Chat.tsx` + `src/hooks/useChatHistory.ts`
