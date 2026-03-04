This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## UI Data Source Switch

The UI can switch data providers from a single env flag:

```bash
# default (if unset)
FINANCE_UI_DATA_SOURCE=mock

# use API-backed provider
FINANCE_UI_DATA_SOURCE=api
FINANCE_API_BASE_URL=http://localhost:3000
```

This flag routes all UI data calls in `lib/data/index.ts` without changing page components.

When `FINANCE_UI_DATA_SOURCE=api`, the UI reads from:

- `/api/transactions`
- `/api/budget/[month]/insights`
- `/api/assets/overview`
- `/api/debts/overview`
- `/api/net-worth`

## Seed Demo Data

To quickly populate API-backed UI screens (dashboard, assets, debts):

```bash
MONGODB_URI=<your-mongodb-uri> npm run seed
```

The seed script inserts:

- 8 months of transactions for trend/summary widgets
- current + previous month budget plans
- debt and non-debt recurring expenses for liabilities/bills panels

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
