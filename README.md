# ScalMint

Marketing site, affiliate programme, and **Ops Console** (`admin.scalmint.com`). Spec: `docs/superpowers/specs/2026-11-02-scalmint-ops-console-design.md`.

## Ops console

Staff only. Operators are database-backed; there is **no default password**.

```bash
npx prisma generate
npx prisma migrate deploy
npm run db:seed          # products + project registry (no operator)
npm run ops:bootstrap    # creates OWNER; prints a one-time reset token
```

Then visit `/admin/login?reset=<token>` and set a 12+ character password. If `ADMIN_PASSWORD` is present during bootstrap it is hashed once — remove it from the environment afterwards.

Probe runner (VPS / pm2, not the Next.js request path): `npm run ops:probe`.

Ingest: `POST /api/ops/ingest/v1/events` with `X-Project-Key`, `Authorization: Bearer <token>`, `X-Signature: t=...,v1=HMAC-SHA256(timestamp.body, token)`.

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
