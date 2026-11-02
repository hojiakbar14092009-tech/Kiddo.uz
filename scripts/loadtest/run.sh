#!/bin/sh
# Database load test (Phase 53). Builds a scratch database on a local
# PostgreSQL with the Supabase stand-in and the migrations (all, or up to
# UPTO, e.g. UPTO=0020 to compare with the state before Phase 53), seeds a year
# of a mid-size audience (seed.sql) and runs pgbench with each workload.
# Nothing remote; the numbers compare versions, they are not a promise of
# production speed. Results: docs/architecture/scale-53.md.
#   PGHOST=/path/to/socket PGUSER=postgres sh scripts/loadtest/run.sh
#   UPTO=0020 CLIENTS=16 SECONDS=20 sh scripts/loadtest/run.sh
set -e
cd "$(dirname "$0")"
DB=${DB:-kiddo_load}
UPTO=${UPTO:-9999}
CLIENTS=${CLIENTS:-16}
SECONDS_EACH=${SECONDS:-20}
P="psql -v ON_ERROR_STOP=1 -q"
$P -c "drop database if exists $DB" -c "create database $DB" >/dev/null 2>&1
$P -d $DB -f ../../supabase/tests/shim.sql >/dev/null 2>&1
for f in ../../supabase/migrations/*.sql; do
  n=$(basename "$f" | cut -c1-4)
  [ "$n" -le "$UPTO" ] || continue
  $P -d $DB -1 -f "$f" >/dev/null 2>&1
done
start=$(date +%s)
$P -d $DB -f seed.sql >/dev/null
echo "seeded in $(( $(date +%s) - start )) s (migrations up to ${UPTO})"
run() {
  name=$1; clients=$2; shift 2
  out=$(pgbench -n -c "$clients" -j 2 -T "$SECONDS_EACH" "$@" $DB 2>&1)
  tps=$(echo "$out" | sed -n 's/^tps = \([0-9.]*\).*/\1/p')
  lat=$(echo "$out" | sed -n 's/^latency average = \([0-9.]*\) ms/\1/p')
  failed=$(echo "$out" | sed -n 's/^number of failed transactions: \([0-9]*\).*/\1/p')
  printf '%-12s %10s tps  %8s ms avg  failed %s\n' "$name" "$tps" "$lat" "${failed:-0}"
}
run restore-old "$CLIENTS" -f parent_read_rls_only.sql
run restore "$CLIENTS" -f parent_read.sql
run reward "$CLIENTS" -f reward.sql
run analytics "$CLIENTS" -f analytics.sql
run admin 2 -f admin.sql
run mixed "$CLIENTS" -f parent_read.sql@6 -f reward.sql@3 -f analytics.sql@1
