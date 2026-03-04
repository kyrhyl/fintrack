# Personal Finance Web App Tracker

## Project
- Name: FinTrack / FinPulse
- Stack: Next.js (App Router) + React + TypeScript + Tailwind + MongoDB (local) + Mongoose
- Mode: Single-user local-first (Phase 1)

## Multi-Agent Operating Plan (2 Agents)

### Agent Roles

#### 1) Function Agent
Owns all non-visual behavior:
- MongoDB + Mongoose setup (`lib/mongodb.ts`, `models/*`)
- API routes (`app/api/*`)
- `zod` request/response validation
- Finance formulas and calculation services
- Seed scripts and data consistency
- Unit/integration tests for logic and endpoints
- Technical docs for API contracts and formulas

#### 2) UI Agent
Owns all visual and interaction work:
- App shell (sidebar, topbar, layout, navigation)
- Page implementations (`/dashboard`, `/tracking`, `/budget`, `/investments`, `/debts`, `/salary`, `/reports`, `/settings`)
- Reusable components (cards, tables, modals, filters, badges, charts)
- Form UX and client-side validation feedback
- Responsive behavior (mobile/tablet/desktop)
- Empty/loading/error states
- Design consistency with reference screens

### Shared Contracts (Single Source of Truth)
- Shared types in `types/finance.ts`
- API response envelope: `{ success: boolean, data?: T, error?: { code: string, message: string } }`
- Month key format: `YYYY-MM`
- Write endpoints require `zod` validation

---

## Roadmap

## Phase 0 - Setup
- [x] Initialize Next.js app with TypeScript and Tailwind
- [x] Add backend dependencies (`mongoose`, `mongodb`, `zod`)
- [x] Add seed runner (`tsx`)

## Phase 1 - Function Agent Foundation
- [x] Create MongoDB connection helper
- [x] Create shared API response helpers
- [x] Create month utility helpers
- [x] Create model: Transaction
- [x] Create model: BudgetPlan (with categories)
- [x] Create model: RecurringExpense
- [x] Create validation schemas for transactions, budget, recurring expenses
- [x] Create seed script and sample data

## Phase 2 - API (Current)
- [x] `GET /api/health`
- [x] `GET /api/transactions`
- [x] `POST /api/transactions`
- [x] `PATCH /api/transactions/:id`
- [x] `DELETE /api/transactions/:id`
- [x] `GET /api/budget/:month`
- [x] `POST /api/budget/:month`
- [x] `POST /api/budget/:month/clone`
- [x] `POST /api/budget/:month/lock`
- [x] `GET /api/budget/:month/insights`
- [x] `GET /api/recurring-expenses`
- [x] `POST /api/recurring-expenses`
- [x] `PATCH /api/recurring-expenses/:id`
- [x] `DELETE /api/recurring-expenses/:id`
- [x] `GET /api/dashboard/overview`
- [x] `GET /api/assets/overview`
- [x] `GET /api/debts/overview`
- [x] `GET /api/salary/overview`

## Phase 3 - Budget Module (Function)
- [x] Budget vs actual computation
- [x] Over-budget insight generation
- [x] Clone previous month plan
- [x] Lock month behavior
- [x] Carry-over logic implementation for next month
- [x] Allocation strategy engine refinement (fixed/variable/percentage)

## Phase 4 - UI Agent Integration (Pending)
- [ ] Build `/budget` page with planner UI
- [ ] Build recurring expenses manager UI
- [ ] Integrate budget insights panel
- [ ] Integrate transaction pages with CRUD endpoints

## Phase 5 - Next Function Tasks
- [x] Add indexes and query optimization review
- [x] Add endpoint test suite (Vitest or Jest)
- [x] Add domain models for investments, liabilities, salary records
- [x] Add dashboard aggregate endpoint

---

## Budget API Endpoints
- `GET /api/budget/:month`
- `POST /api/budget/:month`
- `POST /api/budget/:month/clone`
- `POST /api/budget/:month/lock`
- `GET /api/budget/:month/insights`
- `CRUD /api/recurring-expenses`

## Setup Notes
- Copy `.env.example` to `.env.local`
- Configure local MongoDB in `MONGODB_URI`
- Run seed data: `npm run seed`
