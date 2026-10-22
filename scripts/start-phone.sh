#!/usr/bin/env bash
# Starts the app for Expo Go on a phone on the same Wi-Fi, against the local
# Supabase stack (pnpm dlx supabase start). Optional first argument: the
# Metro port (default 8081).
set -euo pipefail
cd "$(dirname "$0")/.."

eval "$(pnpm dlx supabase status -o env 2>/dev/null)"
if [ -z "${ANON_KEY:-}" ]; then
  echo "The local Supabase stack is not running. Start it with: pnpm dlx supabase start" >&2
  exit 1
fi

# A phone cannot reach 127.0.0.1: use this computer's address on the network.
LAN=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$LAN" ]; then LAN=$(ipconfig getifaddr en0 2>/dev/null || true); fi
if [ -z "$LAN" ]; then
  echo "Could not find this computer's network address." >&2
  exit 1
fi

echo "The phone will use the backend at http://$LAN:54321"
EXPO_PUBLIC_SUPABASE_URL="http://$LAN:54321" \
EXPO_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY" \
  exec pnpm exec expo start --go --clear --port "${1:-8081}"
