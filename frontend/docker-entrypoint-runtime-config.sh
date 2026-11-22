#!/bin/sh
set -eu

envsubst '${VITE_API_URL} ${VITE_SUPABASE_URL} ${VITE_SUPABASE_ANON_KEY}' \
  < /opt/runtime-config.template.js \
  > /usr/share/nginx/html/runtime-config.js
