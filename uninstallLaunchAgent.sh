#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_NAME="com.eagerbardeen.updateData.plist"
AGENT_DIR="$HOME/Library/LaunchAgents"
TARGET="$AGENT_DIR/$PLIST_NAME"

if [ -f "$TARGET" ]; then
  launchctl unload "$TARGET" 2>/dev/null || true
  rm -f "$TARGET"
  echo "Uninstalled LaunchAgent: $TARGET"
else
  echo "LaunchAgent not found: $TARGET"
fi
