#!/bin/sh
# Local RLS/security check: rebuilds a scratch database on a local PostgreSQL,
# loads a minimal Supabase stand-in (roles, auth.users, auth.uid()), applies every
# migration in order (the newest twice, to prove it can be re-run) and runs the
# assertions in rls_test.sql. Needs a running local PostgreSQL; nothing remote.
#   PGHOST=/path/to/socket PGPORT=5432 PGUSER=postgres sh supabase/tests/run.sh
set -e
cd "$(dirname "$0")"
P="psql -v ON_ERROR_STOP=1 -q"
$P -c 'drop database if exists kiddo_rls_test' -c 'create database kiddo_rls_test' 2>&1 | grep -v NOTICE || true
$P -d kiddo_rls_test -f shim.sql 2>&1 | grep -v -e WARN -e HINT || true
for f in ../migrations/*.sql; do
  $P -d kiddo_rls_test -1 -f "$f" 2>&1 | grep -v NOTICE || true
done
last=$(ls ../migrations/*.sql | tail -1)
$P -d kiddo_rls_test -1 -f "$last" 2>&1 | grep -v NOTICE || true
$P -d kiddo_rls_test -f rls_test.sql 2>&1 | grep -E "NOTICE|ERROR|ALL-SQL" | sed 's/psql:[^ ]* //'
