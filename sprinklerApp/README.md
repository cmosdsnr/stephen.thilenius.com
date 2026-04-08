React Native mobile application for managing a 7-channel ESP32-based irrigation system. Built with Expo SDK 53 and Expo Router for file-system-based navigation.

> **Note:** The canonical source for this project lives at `D:\sprinklerApp`. The copy at `thilenius.com/Stephen/sprinklerApp/` is a Windows directory junction pointing there. This is because Expo has issues with long file paths on Windows. 
> To install: npx expo run:android --variant release

## Features

- **Zones** — Collapsible per-channel cards showing the full 14-day schedule grid with inline Run/Stop controls.
- **Manual Override** — Directly turn any channel on for a configurable duration or stop it; only one channel can run at a time.
- **Rules** — Create, edit, and delete repeating watering rules. A rule defines a start time, per-channel durations, and the cycle days it applies to.
- **Calendar** — 4-week calendar view tiling the 14-day cycle. Tap any entry to toggle its suspension for that specific date.
- **System** — Live device variables (time, epoch, boundary date, connection status) with a manual refresh button.

## Architecture

```
sprinklerApp/
├── app/
│   ├── _layout.js          # Root layout: context providers + stack navigator
│   ├── index.js            # Redirect → /(tabs)
│   ├── specificEdit.js     # Stack screen: edit a day/channel entry
│   └── (tabs)/
│       ├── _layout.js      # Tab navigator (5 tabs)
│       ├── index.js        # Zones tab
│       ├── manual.js       # Manual override tab
│       ├── rules.js        # Rules management tab
│       ├── calendar.js     # Calendar view tab
│       └── variables.js    # System variables tab
├── components/
│   └── zones/
│       ├── Zones.jsx       # Container: renders all Zone cards
│       └── Zone.jsx        # Collapsible zone card with day grid
├── contexts/
│   ├── WssContext.js       # WebSocket connection, ping/pong, message queue
│   └── SprinklerContext.js # Schedule state, rules CRUD, suspensions, manual control
└── constants/
    ├── index.js            # Barrel export
    ├── sprinkler.js        # URLs, channel/day counts, labels, message codes
    └── theme.js            # Colors, fonts, sizes, shadows
```

### Data Flow

1. **`WssProvider`** opens a WebSocket to `wss://stephen.thilenius.com` and subscribes to the `'sprinkler'` topic. It queues inbound device messages and exposes `sendMessage` for outbound commands.
2. **`SprinklerProvider`** fetches the initial schedule via `GET /api/sprinkler/load`, derives a rules list from it, and processes real-time WebSocket updates (variable changes, channel on/off, rules acknowledgements).
3. **Tab screens and components** consume context via `useSprinkler()` and `useWss()` hooks.

### Schedule Model

The device runs a repeating **14-day cycle** (2 weeks × 7 days). Each day can hold multiple schedule entries:

```js
{ day: number, ch: number, start: number, duration: number }
```

The app groups these into **rules** — a UI abstraction that represents a set of channels firing sequentially at the same start time on one or more cycle days:

```js
{ id: number, startTime: number, days: boolean[14], durations: number[7] }
```

Rules are serialised back into raw entries when sent to the device.

### Communication Protocol

| Direction           | Transport                          | Format                                          |
| ------------------- | ---------------------------------- | ----------------------------------------------- |
| App → Backend → ESP | WebSocket (`command: 'sprinkler'`) | `{ command, data: { code, ...payload } }`       |
| ESP → Backend → App | WebSocket (`command: 'sprinkler'`) | `{ command, code, ...payload }`                 |
| Initial load        | HTTP GET                           | `{ schedule, variables, name, runningChannel }` |

Outbound codes (`SendCodes`): `UPDATE_ITEMS (100)`, `REQUEST_ALL_DATA (101)`, `UPDATE_RULES (102)`, `UPDATE_SUSPEND (103)`.

Inbound codes (`Codes`): `UPDATE_VARIABLES (101)`, `ON_OFF (107)`, `ACKNOWLEDGE_RULES (105)`, and others.

## Getting Started

```bash
yarn install
yarn start          # Expo dev server (scan QR with Expo Go)
yarn android        # Run on Android device/emulator
yarn ios            # Run on iOS simulator
```

## Documentation

```bash
yarn docs:generate  # Generate TypeDoc HTML to docs/ and copy to network share
yarn docs:serve     # Generate and open docs in browser
```

## Dependencies

| Package                                     | Purpose                      |
| ------------------------------------------- | ---------------------------- |
| `expo` ~53                                  | Expo SDK and build tooling   |
| `expo-router` ~5.1                          | File-system-based navigation |
| `react-native` 0.79                         | Core mobile framework        |
| `react-native-safe-area-context`            | Safe area insets             |
| `react-native-screens`                      | Native screen containers     |
| `@react-native-async-storage/async-storage` | Persistent key-value storage |

## Environment

The backend URL is hard-coded in `constants/sprinkler.js`:

```js
export const SERVER_URL = 'https://stephen.thilenius.com';
export const WSS_URL    = 'wss://stephen.thilenius.com';
```

Change these values to point at a different backend server.
