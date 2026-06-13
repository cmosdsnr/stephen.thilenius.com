#!/usr/bin/env bash
# esp-mdns-bridge.sh
#
# Bridges mDNS announcements (via avahi) into the Dokku backend.
# Runs on the HOST — the backend container cannot receive mDNS multicast directly.
#
# ESP devices   → GET /api/esp/register?ip=<addr>&source=mDNS
#                 Backend fetches /name from the device, registers in ESPlist,
#                 and broadcasts to connected frontend clients.
#
# Other devices → GET /api/esp/mDNSOtherRegister?name=<name>&ip=<addr>
#                 Stored in mDNSOtherList, visible in the "Other mDNS Devices" table.

# Hairpin NAT does not work on this host — stephen.thilenius.com cannot be
# reached locally. Route through the Cloudflare Worker instead, which proxies
# back to the origin from outside the network.
BACKEND="https://stephen.stephen-c19.workers.dev"

declare -A seen_ips   # dedup: skip IPs already registered this session

avahi-browse -rp --all | while IFS=';' read -r type iface proto name svc domain host addr port txt; do
    [[ "$type" == "=" ]]     || continue   # '=' = fully resolved with IP
    [[ "$addr" == *.*.*.* ]] || continue   # IPv4 only, skip link-local IPv6
    [[ -n "${seen_ips[$addr]}" ]] && continue   # already handled this IP
    seen_ips[$addr]=1

    if [[ "$name" == *ESP* ]]; then
        echo "$(date '+%H:%M:%S') mDNS ESP bridge:   $name at $addr"
        curl -sf "${BACKEND}/api/esp/register?ip=${addr}&source=mDNS" > /dev/null
    else
        echo "$(date '+%H:%M:%S') mDNS other bridge: $name at $addr"
        curl -sf "${BACKEND}/api/esp/mDNSOtherRegister?name=${name}&ip=${addr}" > /dev/null
    fi
done
