#!/usr/bin/env bash
# Poll the latest iOS build until it finishes, then submit to TestFlight
# via the interactive submit-driver (the eas.json submit profile alone
# can't auth without the driver picking the existing ASC API key).

set -u
BUILD_ID="438f2910-bebf-4d23-9d65-587a844a6e95"
LOG=/tmp/eas-build-watch.log
STATE=/tmp/eas-build-watch.state

export EXPO_ASC_API_KEY_PATH=/home/wolfgang/.app-store/AuthKey_FS7LQV4533.p8
export EXPO_ASC_API_KEY_ID=FS7LQV4533
export EXPO_ASC_API_KEY_ISSUER_ID=32399b71-6b37-4c52-86c1-4a27eb98cdd1

cd /home/wolfgang/Noah

echo "starting" > "$STATE"
echo "[$(date +%H:%M:%S)] Watching build $BUILD_ID" > "$LOG"

while true; do
  STATUS=$(npx eas-cli build:view "$BUILD_ID" 2>/dev/null | grep -E "^Status" | awk '{$1=""; print $0}' | xargs)
  echo "[$(date +%H:%M:%S)] status=${STATUS:-EMPTY}" >> "$LOG"
  if [ -n "$STATUS" ]; then
    echo "$STATUS" > "$STATE"
  fi

  case "$STATUS" in
    finished)
      echo "[$(date +%H:%M:%S)] BUILD FINISHED — running submit driver" >> "$LOG"
      echo "submitting" > "$STATE"
      python3 /home/wolfgang/Noah/submit-driver.py "$BUILD_ID" >> "$LOG" 2>&1
      RC=$?
      if [ $RC -eq 0 ]; then
        echo "submit_success" > "$STATE"
        echo "[$(date +%H:%M:%S)] SUBMITTED ✓" >> "$LOG"
      else
        echo "submit_failed" > "$STATE"
        echo "[$(date +%H:%M:%S)] SUBMIT FAILED (rc=$RC)" >> "$LOG"
      fi
      break
      ;;
    errored|canceled)
      echo "$STATUS" > "$STATE"
      echo "[$(date +%H:%M:%S)] BUILD $STATUS" >> "$LOG"
      break
      ;;
  esac

  sleep 45
done
