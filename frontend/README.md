# frontend

BTS School Manager frontend (Next.js + TypeScript + Tailwind CSS).

## Setup

```bash
npm install
cp .env.example .env.local   # or set NEXT_PUBLIC_API_URL
npm run dev
```

Default dev URL: http://localhost:3000

## Structure

- `app/` - routes (login, dashboard/*)
- `components/ui/` - design system (Button, Input, Card, Badge, Spinner)
- `components/layout/` - Sidebar, Topbar
- `lib/` - API client (axios), auth context, i18n provider
- `messages/` - translations (fr, en, ar)

The interface is translated in three languages (French default, Arabic RTL).