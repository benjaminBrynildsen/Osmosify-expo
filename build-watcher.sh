#!/usr/bin/env bash
# Poll the latest iOS build until it finishes, then submit to TestFlight.

set -u
BUILD_ID="e54c5d43-3141-4871-8fa6-9111e112227c"
LOG=/tmp/eas-build-watch.log
STATE=/tmp/eas-build-watch.state

export EXPO_ASC_API_KEY_PATH=/home/wolfgang/.app-store/AuthKey_FS7LQV4533.p8
export EXPO_ASC_API_KEY_ID=FS7LQV4533
export EXPO_ASC_API_KEY_ISSUER_ID=32399b71-6b37-4c52-86c1-4a27eb98cdd1

cd /home/wolfgang/Noah

echo "starting" > "$STATE"
echo "[$(date +%H:%M:%S)] Watching build $BUILD_ID" > "$LOG"

while true; do
  # Use the text output and grep for Status — JSON parsing was flaky
  # because npm puts upgrade warnings on stderr that bleed into stdout.
  STATUS=$(npx eas-cli build:view "$BUILD_ID" 2>/dev/null | grep -E "^Status" | awk '{$1=""; print $0}' | xargs)
  echo "[$(date +%H:%M:%S)] status=${STATUS:-EMPTY}" >> "$LOG"
  if [ -n "$STATUS" ]; then
    echo "$STATUS" > "$STATE"
  fi

  case "$STATUS" in
    finished)
      echo "[$(date +%H:%M:%S)] BUILD FINISHED — submitting to TestFlight" >> "$LOG"
      echo "submitting" > "$STATE"
      npx eas-cli submit --platform ios --id "$BUILD_ID" --non-interactive >> "$LOG" 2>&1
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
