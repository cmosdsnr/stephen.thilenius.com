#!/usr/bin/env bash
# This script is a network change notifier. It watches your local network interface (like eno1) and tells 
# a web application if your IP address subnet (prefix) changes.
# 
# Here is the step-by-step breakdown:
# 
# Safety Checks:
# 
# It uses a "lock file" so that if the script runs every minute, multiple copies won't pile up on top of each other.
# It verifies the network interface actually exists before doing anything.
# Get Local Network Info:
# 
# It looks up your current IP address and subnet mask (e.g., 192.168.1.50/24).
# It calculates the "Network Prefix".
# Example: If you are on 192.168.1.50, the prefix is 192.168.1.
# Check the Server:
# 
# It asks your web server (https://stephen.thilenius.com/app/getPrefix) "What network prefix do you think I have?"
# It does this securely but locally (forcing the request to go to 127.0.0.1, presumably your local Nginx proxy).
# Compare & Update:
# 
# If they match: It does nothing (exits).
# If they differ: It calls the "Set" URL (/app/setPrefix) to tell the server the new address.

set -Eeuo pipefail

# --- Config (override via env or args) ---
IFACE="${1:-${IFACE:-eno1}}"                          # interface to watch
APP_HOST="${APP_HOST:-stephen.thilenius.com}"         # vhost/cert name
GET_ENDPOINT_PATH="${GET_ENDPOINT_PATH:-/app/getPrefix}"
SET_ENDPOINT_PATH="${SET_ENDPOINT_PATH:-/app/setPrefix}"
RESOLVE_IP="${RESOLVE_IP:-127.0.0.1}"                 # nginx on localhost
IP_CMD="${IP_CMD:-$(command -v ip || echo /sbin/ip)}" # ip path for cron

# --- State/lock live next to the script ---
SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="${SCRIPT_DIR}/.prefix-watcher"
mkdir -p "$STATE_DIR"
LOCK_FILE="${STATE_DIR}/lock_${IFACE}.lock"

# --- Prevent overlapping runs ---
exec 9>"$LOCK_FILE" || true
flock -n 9 || exit 0

# --- Helpers (no external deps) ---
ip2int() { local IFS=.; set -- $1; echo $((((($1<<24))+($2<<16))+($3<<8)+$4)); }
int2ip() { printf "%d.%d.%d.%d" $(( ($1>>24)&255 )) $(( ($1>>16)&255 )) $(( ($1>>8)&255 )) $(( $1&255 )); }
network_of() {
  local ip="$1" plen="$2" ipi mask net
  ipi=$(ip2int "$ip")
  mask=$(( 0xFFFFFFFF << (32 - plen) & 0xFFFFFFFF ))
  net=$(( ipi & mask ))
  int2ip "$net"
}
# Turn a prefix string into canonical "network/CIDR" for fair comparison.
# - "192.168.1"     -> "192.168.1.0/24"
# - "192.168.1.0/24" (unchanged)
# - "192.168.0.0/20" (unchanged)
canonicalize() {
  local s="$1"
  if [[ -z "$s" ]]; then echo ""; return; fi
  if [[ "$s" =~ ^([0-9]{1,3}\.){2}[0-9]{1,3}$ ]]; then
    echo "${s}.0/24"
  elif [[ "$s" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}/[0-9]{1,2}$ ]]; then
    echo "$s"
  elif [[ "$s" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
    echo "$s/32"
  else
    echo "$s"
  fi
}

# --- Verify interface exists ---
if ! "$IP_CMD" link show dev "$IFACE" &>/dev/null; then
  exit 0
fi

# --- Get IPv4 addr/cidr for the interface ---
CIDR=$("$IP_CMD" -4 -o addr show dev "$IFACE" scope global 2>/dev/null | awk '{print $4}' | head -n1 || true)
[[ -z "${CIDR:-}" ]] && exit 0

IP="${CIDR%/*}"
PLEN="${CIDR#*/}"
[[ "$IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || exit 0
[[ "$PLEN" =~ ^[0-9]{1,2}$ ]] || exit 0

# --- Compute local prefix (what we'll SEND) + canonical form (for compare) ---
NET_ADDR=$(network_of "$IP" "$PLEN")
if [[ "$PLEN" -eq 24 ]]; then
  LOCAL_PREFIX_SEND="${NET_ADDR%.*}"       # e.g., 192.168.1
else
  LOCAL_PREFIX_SEND="${NET_ADDR}/${PLEN}"  # e.g., 192.168.0.0/20
fi
LOCAL_PREFIX_CANON="${NET_ADDR}/${PLEN}"   # always network/CIDR, for comparison

# --- Fetch current prefix from the app ---
GET_URL="https://${APP_HOST}${GET_ENDPOINT_PATH}"
REMOTE_JSON="$(curl -fsS --max-time 5 --resolve "${APP_HOST}:443:${RESOLVE_IP}" -H 'Accept: application/json' "$GET_URL" || true)"

# Extract "prefix" value without jq
REMOTE_PREFIX="$(printf '%s' "$REMOTE_JSON" | sed -n 's/.*"prefix"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
REMOTE_PREFIX_CANON="$(canonicalize "$REMOTE_PREFIX")"

# If GET failed or didn't yield a prefix, we can choose to set (since we can't compare),
# or bail quietly. We'll SET to ensure the server learns the current value.
if [[ -z "$REMOTE_PREFIX_CANON" ]]; then
  NEED_SET=1
else
  NEED_SET=0
  [[ "$LOCAL_PREFIX_CANON" != "$REMOTE_PREFIX_CANON" ]] && NEED_SET=1
fi

if [[ "$NEED_SET" -eq 1 ]]; then
  # URL-encode "/" in non-/24 cases
  ENCODED_PREFIX="${LOCAL_PREFIX_SEND//\//%2F}"
  SET_URL="https://${APP_HOST}${SET_ENDPOINT_PATH}?p=${ENCODED_PREFIX}"
  curl -fsS --max-time 5 --resolve "${APP_HOST}:443:${RESOLVE_IP}" "$SET_URL" >/dev/null || true
fi

