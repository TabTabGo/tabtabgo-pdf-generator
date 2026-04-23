#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/tabtabgo-pdf-generator}"
PORT="${PORT:-3000}"
ONLYOFFICE_STARTUP_TIMEOUT_SECONDS="${ONLYOFFICE_STARTUP_TIMEOUT_SECONDS:-120}"

export PORT
export ONLYOFFICE_DOCUMENT_SERVER_URL="${ONLYOFFICE_DOCUMENT_SERVER_URL:-http://127.0.0.1}"
export OFFICE_DOCUMENT_FETCH_BASE_URL="${OFFICE_DOCUMENT_FETCH_BASE_URL:-http://127.0.0.1:${PORT}}"
export ONLYOFFICE_REQUEST_TIMEOUT_MS="${ONLYOFFICE_REQUEST_TIMEOUT_MS:-120000}"
export ALLOW_PRIVATE_IP_ADDRESS="${ALLOW_PRIVATE_IP_ADDRESS:-true}"

# Keep JWT disabled by default for the self-contained image, because otherwise
# ONLYOFFICE generates a random secret that the API cannot know.
if [[ -n "${ONLYOFFICE_JWT_SECRET:-}" || -n "${JWT_SECRET:-}" ]]; then
  export JWT_ENABLED="${JWT_ENABLED:-true}"
  export JWT_SECRET="${JWT_SECRET:-${ONLYOFFICE_JWT_SECRET:-}}"
  export ONLYOFFICE_JWT_SECRET="${ONLYOFFICE_JWT_SECRET:-${JWT_SECRET}}"
else
  export JWT_ENABLED=false
fi

if [[ -z "${PUPPETEER_EXECUTABLE_PATH:-}" ]]; then
  CHROME_PATH="$(find /opt/puppeteer/.cache/puppeteer/chrome -name chrome -type f | sort | tail -n 1 || true)"
  if [[ -z "${CHROME_PATH}" ]]; then
    echo "ERROR: Chrome executable not found in /opt/puppeteer/.cache/puppeteer" >&2
    exit 1
  fi
  export PUPPETEER_EXECUTABLE_PATH="${CHROME_PATH}"
fi

onlyoffice_pid=""
api_pid=""

cleanup() {
  trap - EXIT SIGTERM SIGINT SIGQUIT SIGABRT

  if [[ -n "${api_pid}" ]] && kill -0 "${api_pid}" 2>/dev/null; then
    kill -TERM "${api_pid}" 2>/dev/null || true
  fi

  if [[ -n "${onlyoffice_pid}" ]] && kill -0 "${onlyoffice_pid}" 2>/dev/null; then
    kill -TERM "${onlyoffice_pid}" 2>/dev/null || true
  fi

  if [[ -n "${api_pid}" ]]; then
    wait "${api_pid}" 2>/dev/null || true
  fi

  if [[ -n "${onlyoffice_pid}" ]]; then
    wait "${onlyoffice_pid}" 2>/dev/null || true
  fi
}

trap cleanup EXIT SIGTERM SIGINT SIGQUIT SIGABRT

/app/ds/run-document-server.sh &
onlyoffice_pid="$!"

for attempt in $(seq 1 "${ONLYOFFICE_STARTUP_TIMEOUT_SECONDS}"); do
  if curl -fsS "${ONLYOFFICE_DOCUMENT_SERVER_URL}/healthcheck" >/dev/null 2>&1; then
    echo "ONLYOFFICE Document Server is ready."
    break
  fi

  if ! kill -0 "${onlyoffice_pid}" 2>/dev/null; then
    wait "${onlyoffice_pid}"
    exit "$?"
  fi

  if [[ "${attempt}" == "${ONLYOFFICE_STARTUP_TIMEOUT_SECONDS}" ]]; then
    echo "WARNING: ONLYOFFICE healthcheck did not become ready within ${ONLYOFFICE_STARTUP_TIMEOUT_SECONDS}s; starting API anyway." >&2
    break
  fi

  sleep 1
done

cd "${APP_DIR}"
node dist/index.js &
api_pid="$!"

wait -n "${onlyoffice_pid}" "${api_pid}"
exit "$?"
