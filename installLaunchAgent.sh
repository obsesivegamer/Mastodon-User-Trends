#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_NAME="com.eagerbardeen.updateData.plist"
AGENT_DIR="$HOME/Library/LaunchAgents"
TARGET="$AGENT_DIR/$PLIST_NAME"
LOG_FILE="$SCRIPT_DIR/updateData.log"

mkdir -p "$AGENT_DIR"

cat > "$TARGET" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.eagerbardeen.updateData</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$SCRIPT_DIR/updateDaily.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>3</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_FILE</string>
  <key>StandardErrorPath</key>
  <string>$LOG_FILE</string>
</dict>
</plist>
EOF

launchctl unload "$TARGET" 2>/dev/null || true
launchctl load "$TARGET"

echo "Installed LaunchAgent: $TARGET"
echo "Daily updates scheduled at 03:00 local time."
echo "Logs will be written to: $LOG_FILE"
