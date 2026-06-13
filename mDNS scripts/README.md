# mDNS Bridge Scripts

Bridges mDNS/Bonjour device announcements from the host into the Dokku backend.

## Why

The backend runs inside a Docker/Dokku container. Docker containers cannot receive
mDNS multicast traffic (UDP 224.0.0.251:5353), and `avahi-daemon` on the host already
owns that port. These scripts run on the **host** and forward discoveries to the backend
via HTTP.

## How it works

`avahi-browse` watches for all `_http._tcp` service announcements on the LAN.
When a device appears:

- **ESP devices** (name contains `ESP`) → `GET /api/esp/register?ip=<addr>`
  The backend fetches `/name` from the device, registers it in `ESPlist`, and
  broadcasts the update to connected frontend clients. Source is recorded as `"mDNS"`.

- **Other devices** → `GET /api/esp/mDNSOtherRegister?name=<name>&ip=<addr>`
  Stored in `mDNSOtherList`, visible in the "Other mDNS Devices" table in the
  ESP32 admin page.

## Backend endpoints used

| Endpoint | Purpose |
|---|---|
| `GET /api/esp/register?ip=<ip>` | Register an ESP device by IP |
| `GET /api/esp/mDNSOtherRegister?name=<name>&ip=<ip>` | Register a non-ESP mDNS device |
| `GET /api/esp/ESPlist` | View registered ESP devices |
| `GET /api/esp/mDNSOther` | View registered non-ESP devices |

## Install

```bash
# 1. Copy files to the host
sudo cp esp-mdns-bridge.sh /usr/local/bin/esp-mdns-bridge.sh
sudo chmod +x /usr/local/bin/esp-mdns-bridge.sh
sudo cp esp-mdns-bridge.service /etc/systemd/system/

# 2. Set the correct backend port in the script
#    Edit BACKEND= in /usr/local/bin/esp-mdns-bridge.sh

# 3. Enable and start
sudo systemctl daemon-reload
sudo systemctl enable --now esp-mdns-bridge

# 4. Check it's running
sudo systemctl status esp-mdns-bridge
journalctl -u esp-mdns-bridge -f
```

## Troubleshooting

```bash
# Test avahi can see devices
avahi-browse -t _http._tcp

# Test an endpoint manually
curl "http://localhost:5000/api/esp/register?ip=192.168.1.x"
curl "http://localhost:5000/api/esp/mDNSOtherRegister?name=MyDevice&ip=192.168.1.x"
```
