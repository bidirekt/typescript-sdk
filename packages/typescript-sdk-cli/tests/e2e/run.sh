#!/bin/sh
# Publishes the expected.yaml of every success fixture, with the *.graphqls beside it, to a throwaway broker, one participant per fixture.
# Proves the broker accepts what generate writes. COMPOSE_PROJECT_NAME picks the compose project (default typescript-sdk-e2e).
# E2E_COMPOSE_OVERRIDE names a compose file passed as a second -f, such as one with broker and CLI images that read GraphQL.
# Without it the GraphQL fixtures are skipped; with it a GraphQL consumer is also checked against a subgraph's SDL.
set -eu

dir=$(cd "$(dirname "$0")" && pwd)
fixtures=$(cd "$dir/../fixtures" && pwd)
project=${COMPOSE_PROJECT_NAME:-typescript-sdk-e2e}
override=${E2E_COMPOSE_OVERRIDE:-}

compose() {
  if [ -n "$override" ]; then
    docker compose -p "$project" -f "$dir/compose.yaml" -f "$override" "$@"
  else
    docker compose -p "$project" -f "$dir/compose.yaml" "$@"
  fi
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
skipped=0
for expected in "$fixtures"/*/expected.yaml; do
  fixture=$(basename "$(dirname "$expected")")
  participant=e2e_$(printf '%s' "$fixture" | tr - _)

  if [ -z "$override" ] && grep -Eq '^( {2}| {4})graphql:$' "$expected"; then
    skipped=$((skipped + 1))
    continue
  fi

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

echo "$published published, $rejected rejected, $skipped GraphQL fixtures skipped"
[ "$rejected" = 0 ]

if [ -z "$override" ]; then
  exit 0
fi

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
