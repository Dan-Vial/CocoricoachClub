#!/bin/sh

# Cleanup
rm -rf node_modules
bun install --frozen-lockfile

# Migrate database
# supabase db reset --yes

# Start dev server
bun run dev
