# BalaOne Properties

AI-powered commercial real estate platform for SMEs in Hong Kong. Find, evaluate, and shortlist verified commercial properties with intelligent search, compliance pre-checks, and evidence packs.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL with pgvector)
- **ORM**: Prisma
- **Auth**: NextAuth.js v5
- **UI**: Tailwind CSS + shadcn/ui-style components
- **AI**: OpenAI GPT-4o + text-embedding-3-small

## Getting Started

### Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com) account (PostgreSQL with pgvector)
- OpenAI API key (for AI features)

### Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Create a Supabase project:**

- Go to [supabase.com](https://supabase.com) → New Project
- Note your project ref, database password, and region
- Enable the **pgvector** extension: SQL Editor → run `CREATE EXTENSION IF NOT EXISTS vector;`

3. **Configure environment:**

Copy `.env.example` to `.env` and fill in your values:

```
# Supabase Database (Project Settings → Database → Connection string URI)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?schema=public"

# Supabase Client (Project Settings → API - optional, for Storage/Realtime)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Auth
NEXTAUTH_SECRET="generate-a-random-secret"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-your-key-here"
```

3. **Set up the database:**

```bash
# Create database and run migrations
npx prisma db push

# Seed with sample data
npx tsx src/scripts/seed.ts
```

4. **Start the dev server:**

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Demo Account

After seeding, log in with:
- Email: `demo@balaone.com`
- Password: `demo1234`

## Features (MVP)

- **AI-Powered Search**: Natural language query parsing converts descriptions into structured filters
- **Home Feed**: Curated hot properties ranked by engagement
- **Property Detail**: Normalized data with image gallery, key metrics, and source attribution
- **Evidence Pack**: Verification checklist (ownership, floor plan, building record, tenancy, UBW)
- **Fit-for-Use Risk Assessment**: Sector-specific compliance pre-checks for F&B, Retail, and Warehouse
- **Shortlisting**: Save properties and track interactions
- **Onboarding Wizard**: Multi-step profile setup for personalized recommendations
- **Filter & Sort**: District, property type, rent range, area range with real-time filtering

## Project Structure

```
src/
├── app/               # Next.js App Router pages and API routes
├── components/        # React components (UI primitives + feature components)
├── lib/               # Core libraries (prisma, auth, AI modules, validators)
├── types/             # TypeScript type definitions
└── scripts/           # Database seed and ingestion scripts
```

## License

Private - All rights reserved.
