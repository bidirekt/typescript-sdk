#!/bin/sh
# Publishes the expected.yaml of every success fixture, with the *.graphqls beside it, to a throwaway broker, one participant per fixture.
# Proves the broker accepts what generate writes, then checks two GraphQL consumers against a subgraph's SDL.
# COMPOSE_PROJECT_NAME picks the compose project (default typescript-sdk-e2e).
set -eu

dir=$(cd "$(dirname "$0")" && pwd)
fixtures=$(cd "$dir/../fixtures" && pwd)
project=${COMPOSE_PROJECT_NAME:-typescript-sdk-e2e}

compose() {
  docker compose -p "$project" -f "$dir/compose.yaml" "$@"
}

cli() {
  compose run --rm -T cli "$@" 2>&1 </dev/null
}

failed=0
cleanup() {
  if [ "$failed" != 0 ]; then
    compose logs broker
  fi
  compose down -v --remove-orphans
}
trap 'failed=$?; cleanup' EXIT
# dash and busybox ash skip the EXIT trap when a signal kills the shell.
trap 'exit 1' HUP INT TERM

compose up -d --wait

# docker compose run reads all of a stdin that is not a terminal, such as a script piped to sh.
BIDIREKT_API_KEY=$(compose run --rm -T setup </dev/null)
export BIDIREKT_API_KEY

# The fixture folder's contract files, relative to the cli service's working directory.
contract_files() {
  printf '%s/expected.yaml\n' "$1"
  for schema in "$fixtures/$1"/*.graphqls; do
    if [ -e "$schema" ]; then
      printf '%s/%s\n' "$1" "$(basename "$schema")"
    fi
  done
}

published=0
rejected=0
for expected in "$fixtures"/*/expected.yaml; do
  fixture=$(basename "$(dirname "$expected")")
  participant=e2e_$(printf '%s' "$fixture" | tr - _)

  if output=$(cli create-participant "$participant") &&
    output=$(cli publish $(contract_files "$fixture") --participant "$participant" --version 1); then
    published=$((published + 1))
    echo "ok $fixture"
  else
    rejected=$((rejected + 1))
    echo "FAIL $fixture"
    printf '%s\n' "$output" | sed 's/^/  /'
  fi
done

echo "$published published, $rejected rejected"
[ "$rejected" = 0 ]

provider=graphql-graph-only
consumer=graphql-consumer-handlers
consumer_participant=e2e_$(printf '%s' "$consumer" | tr - _)
if ! output=$(cli create-environment production) ||
  ! output=$(cli create-participant petstore_api) ||
  ! output=$(cli publish $(contract_files "$provider") --participant petstore_api --version 1) ||
  ! output=$(cli record-deployment petstore_api --version 1 --environment production); then
  echo "FAIL deploy $provider as petstore_api"
  printf '%s\n' "$output" | sed 's/^/  /'
  exit 1
fi

if output=$(cli can-i-deploy "$consumer_participant" --version 1 --environment production); then
  echo "FAIL $consumer can be deployed against $provider"
  printf '%s\n' "$output" | sed 's/^/  /'
  exit 1
fi

expected_break="$consumer_participant 1 cannot be deployed to production

petstore_api (1, deployed):
  Pet.name — $consumer_participant doesn't accept null, but petstore_api may provide null (3 places)
    → $consumer_participant: handle null in the code, then mark it nullable
    → petstore_api: stop providing null there
      · mutation adoptPet returns at \"\$.name\" (petstore_api: Pet.name)
      · query pet returns at \"\$.name\" (petstore_api: Pet.name)
      · query pets returns at \"\$[].name\" (petstore_api: Pet.name)"
case $output in
  *"$expected_break"*)
    echo "ok $consumer cannot be deployed against $provider"
    ;;
  *)
    echo "FAIL $consumer against $provider: expected the break"
    printf '%s\n' "$expected_break" | sed 's/^/  /'
    echo "got"
    printf '%s\n' "$output" | sed 's/^/  /'
    exit 1
    ;;
esac

enum_consumer=graphql-returns-enum
enum_participant=e2e_$(printf '%s' "$enum_consumer" | tr - _)
if output=$(cli can-i-deploy "$enum_participant" --version 1 --environment production); then
  echo "FAIL $enum_consumer can be deployed against $provider"
  printf '%s\n' "$output" | sed 's/^/  /'
  exit 1
fi

# The block's title is the consumer's schema the break sits in, StatusOrNull; the type the consumer reads is Status.
expected_enum_break="— $enum_participant reads it as Status, but petstore_api provides String
    → $enum_participant: read it as String
    → petstore_api: provide it as Status there
      · query status returns at \"\$\" (petstore_api: Query.status)"
case $output in
  *"as StatusOrNull"*)
    echo "FAIL $enum_consumer against $provider: the break names the type StatusOrNull"
    printf '%s\n' "$output" | sed 's/^/  /'
    exit 1
    ;;
  *"$expected_enum_break"*)
    echo "ok $enum_consumer cannot be deployed against $provider"
    ;;
  *)
    echo "FAIL $enum_consumer against $provider: expected the break"
    printf '%s\n' "$expected_enum_break" | sed 's/^/  /'
    echo "got"
    printf '%s\n' "$output" | sed 's/^/  /'
    exit 1
    ;;
esac
