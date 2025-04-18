#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
COMPOSE_FILE="docker-compose.test.yaml"
TESTS_DIR="./back-end/tests"
SEED_IMG_DIR="./back-end/seed-images"
BACKEND_SERVICE_NAME="backend-test"
DEPENDENCY_SERVICES="mongo-test minio-test" # List dependency services
CONTAINER_TESTS_PATH="/app/tests"
CONTAINER_SEED_IMG_PATH="/app/seed-images"

# --- Cleanup Function ---
cleanup() {
  echo "--- Cleaning up test environment ---"
  docker compose -f "$COMPOSE_FILE" down -v --remove-orphans || true
  echo "--- Cleanup finished ---"
}

# --- Trap EXIT Signal ---
trap cleanup EXIT

# --- Setup Phase ---
echo "--- Starting test dependencies ($DEPENDENCY_SERVICES) ---"
docker compose -f "$COMPOSE_FILE" up -d --wait $DEPENDENCY_SERVICES
echo "--- Test dependencies are up and healthy ---"

echo "--- Building Docker Image for $BACKEND_SERVICE_NAME ---"
docker compose -f "$COMPOSE_FILE" build "$BACKEND_SERVICE_NAME"

# --- Execution Phase ---
echo "--- Running Backend Integration Tests ---"
test_exit_code=0

# Define the command and arguments for the container as an array
COMMAND_ARGS=(npm test "$@")

# Run the tests using the array for command arguments
# Ensure "$BACKEND_SERVICE_NAME" is the last argument before the command array
docker compose -f "$COMPOSE_FILE" run \
  -v "$(pwd)/$TESTS_DIR":"$CONTAINER_TESTS_PATH":ro \
  -v "$(pwd)/$SEED_IMG_DIR":"$CONTAINER_SEED_IMG_PATH":ro \
  --rm \
  "$BACKEND_SERVICE_NAME" \
  "${COMMAND_ARGS[@]}" || test_exit_code=$? # Use the array here

echo "--- Backend Integration Tests Finished (Exit Code: $test_exit_code) ---"

# --- Exit with Test Status ---
exit $test_exit_code