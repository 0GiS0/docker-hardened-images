#!/bin/sh
set -e

# Generate security status report
STATUS_FILE="/tmp/status.json"

# Check user
CURRENT_USER=$(id -un 2>/dev/null || echo "unknown")
CURRENT_UID=$(id -u 2>/dev/null || echo "unknown")
IS_ROOT="false"
[ "$CURRENT_UID" = "0" ] && IS_ROOT="true"

# Check package manager
HAS_APK="false"
APK_OUTPUT=""
if command -v apk >/dev/null 2>&1; then
    HAS_APK="true"
    APK_OUTPUT=$(apk --version 2>&1 || true)
fi

HAS_APT="false"
if command -v apt >/dev/null 2>&1; then
    HAS_APT="true"
fi

# Check available shells
HAS_BASH="false"
command -v bash >/dev/null 2>&1 && HAS_BASH="true"

HAS_SH="false"
command -v sh >/dev/null 2>&1 && HAS_SH="true"

# Check listening port from nginx config
LISTEN_PORT=$(grep -r "listen" /etc/nginx/ 2>/dev/null | grep -oE '[0-9]+' | head -1 || echo "unknown")

# Check write access to sensitive paths
CAN_WRITE_ETC="false"
if touch /etc/_test_write 2>/dev/null; then
    CAN_WRITE_ETC="true"
    rm -f /etc/_test_write
fi

CAN_WRITE_USR="false"
if touch /usr/_test_write 2>/dev/null; then
    CAN_WRITE_USR="true"
    rm -f /usr/_test_write
fi

# Check if we can install packages
CAN_INSTALL="false"
if [ "$HAS_APK" = "true" ]; then
    if apk add --simulate curl >/dev/null 2>&1; then
        CAN_INSTALL="true"
    fi
fi

# Generate JSON
cat > "$STATUS_FILE" <<EOF
{
  "timestamp": "$(date -Iseconds 2>/dev/null || date)",
  "user": {
    "name": "$CURRENT_USER",
    "uid": $CURRENT_UID,
    "is_root": $IS_ROOT
  },
  "port": {
    "listening": $LISTEN_PORT
  },
  "package_manager": {
    "apk_available": $HAS_APK,
    "apt_available": $HAS_APT,
    "can_install": $CAN_INSTALL,
    "apk_version": "$APK_OUTPUT"
  },
  "shell": {
    "sh_available": $HAS_SH,
    "bash_available": $HAS_BASH
  },
  "filesystem": {
    "can_write_etc": $CAN_WRITE_ETC,
    "can_write_usr": $CAN_WRITE_USR
  }
}
EOF

echo "[check] Status report generated at $STATUS_FILE"

# Execute the original entrypoint or nginx directly
if [ -f /docker-entrypoint.sh ]; then
    exec /docker-entrypoint.sh "$@"
else
    exec "$@"
fi
