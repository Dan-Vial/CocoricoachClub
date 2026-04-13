#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

LOCK_FILE="$SCRIPT_DIR/.lock"

if [ -f "$LOCK_FILE" ]; then
  echo "Setup already done. Remove .lock to re-run."
  exit 0
fi

MODE="${MODE:-development}"

echo "Using mode: $MODE"

ENV_FILE=".env.$MODE"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

# Charger les variables
set -a
source "$ENV_FILE"
set +a

echo "Linking project: $SUPABASE_PROJECT_ID"

# if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
#   echo "Missing SUPABASE_ACCESS_TOKEN"
#   exit 1
# fi
#
# if [ -z "$SUPABASE_PROJECT_ID" ]; then
#   echo "Missing SUPABASE_PROJECT_ID"
#   exit 1
# fi

echo "Cleanup node_modules"
rm -rf node_modules

echo "Installing dependencies with bun"
bun install --frozen-lockfile

echo "Connect to your supabase account"
# bunx supabase login
bunx supabase link --project-ref "$SUPABASE_PROJECT_ID"

# echo "Migrate database"
# bunx supabase db lint --linked
# bunx supabase db reset --linked
# bunx supabase migration up --linked
# bunx supabase db push --linked

# Déployer toutes les fonctions
# bunx supabase functions deploy

touch "$LOCK_FILE"

echo "Setup complete ✔"
