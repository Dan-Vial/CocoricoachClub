# CocoricoachClub - Documentation

## Development Environment Setup

This guide explains how to install and run the project locally

## Prerequisites

Make sure you have installed:

- [bun](https://bun.com/) – JavaScript runtime & toolkit
- [Docker](https://www.docker.com/) or [Podman](https://podman.io/) with Compose
- A [Supabase](https://supabase.com/) account and project
- A [OneSignal](https://onesignal.com/) account and project

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

Then start the dev server:

```bash
bun run dev
```

---

## Useful commands

```bash
bun run build
bun run build:dev
bunx supabase --help
```
