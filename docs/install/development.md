# CocoricoachClub - Documentation

## Development Environment Setup

This guide explains how to install and run the project locally

## Prerequisites

Make sure you have installed:

- [Docker](https://www.docker.com/) or [Podman](https://podman.io/) with Compose
- A [Supabase](https://supabase.com/) account and project
- A [OneSignal](https://onesignal.com/) account and project
- Installed Bun and Bunx optional dependencies

> Windows users may need to install
>
> - [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install)
> - [Docker Desktop](https://www.docker.com/products/docker-desktop/)
> to run the project.

---

## Setup

Clone the repository:

```bash
git clone https://github.com/danvial/CocoricoachClub.git
cd CocoricoachClub
```

---

## Environment variables

Copy the example file and configure your environment:

```bash
cp .env.example .env
```

You may also define environment-specific files:

- `.env`
- `.env.development`
- `.env.production`

> These files are ignored by Git.

---

## Start the development environment

> ⚠️ **Important**
>
> Environment variables are used across multiple layers:
>
> - Frontend (Vite)
> - Backend services (Supabase)
> - CLI tools (Supabase CLI)
> - Initialization scripts
> - ...
>
> Make sure `.env`, `.env.development`, `.env.production`
> are properly configured before starting the environment.
> If needed, refer to `.env.example` for required variables.

Build images:

```bash
docker compose build
```

Start containers:

```bash
docker compose down -v
docker compose up -d
```

Access the frontend container:

```bash
docker compose exec frontend bash
```

First, install initialize:

```bash
# Cleanup node_modules
rm -rf node_modules

# Installing dependencies with bun
bun install --frozen-lockfile

# Connect to your supabase account (SUPABASE_ACCESS_TOKEN)
bunx supabase link --project-ref "$SUPABASE_PROJECT_ID"

# Add secrets
bunx supabase secrets set SECRET_EXEMPLE="SECRET_VALUE"

# Migrate database
bunx supabase db push --linked

# Deploy edge Functions
bunx supabase functions deploy
```

Then start the dev server:

```bash
bun run dev
```

---

## Add user to super_admin_users

After inscription and email confirmation, go to Supabase SQL Editor:

```sql
-- Get your user_id
SELECT id, email FROM auth.users WHERE email = 'your@email.com';

-- Insert into super_admin_users
INSERT INTO public.super_admin_users (user_id, granted_by)
SELECT id, id FROM auth.users WHERE email = 'your@email.com';
```

---
