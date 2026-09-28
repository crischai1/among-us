# Among Us (web)

A browser-based Among Us clone with real-time online multiplayer. Everything is drawn in code: no image or audio assets.

- **Online rooms:** 6-letter room codes and invite links (`?room=CODE`), up to 15 players, up to 3 impostors.
- **Roles:** Crewmate and Impostor, plus optional Engineer (vents), Scientist (portable vitals) and Shapeshifter.
- **Maps** (the host picks one in Settings):
  - **The Skeld:** 14 rooms, hallways, doors, 4 vent networks, 4 security cameras, and admin and vitals consoles.
  - **MIRA HQ:** traced from the original's layout: Launchpad, Locker Room, Decontamination, Reactor, Laboratory, the Y-shaped hallway, Office, Admin, the domed Greenhouse, Communications, MedBay, Storage, Cafeteria and Balcony, floating in open sky. Its gimmicks:
    - all 11 vents form one network;
    - no cameras and no doors to lock; instead a **door log** in Communications records who passes the north, southwest and southeast sensors of the Y hallway (last 20 entries, 5 s per player per sensor);
    - **decontamination**: walking into the chamber shuts both doors for 3 seconds while it's sprayed;
    - comms is fixed by typing a code that changes every 10 seconds, at both the Communications and Office keypads;
    - you start on the Launchpad and meet in the Cafeteria.
  - **Polus:** traced from the original: buildings spread over an open snowfield on a rocky planet, a lava pit, the Dropship with a seismic stabilizer tower either side, and the octagonal Specimen Room behind two decontamination corridors. Its gimmicks:
    - sabotaged doors (Electrical, O2, Communications, Weapons, Storage, Office, Laboratory) stay shut until a living player opens each one by flipping its switches;
    - **Seismic Stabilizers** replaces the reactor: hold both tower panels within 60 seconds;
    - 6 security cameras, vitals in the Office, and an admin map that ignores anyone out in the snow;
    - 4 vent networks; you start in the Dropship and meet around the Office table.
  - The admin table can be used from any side of it, on every map.
  - Ghosts can use security cameras, the admin table, vitals and the door log too. A ghost watching the cameras doesn't turn on the camera light.
  - Each map file (`shared/map/skeld.ts`, `shared/map/mira.ts`, `shared/map/polus.ts`) lists its sabotages and task recipes (one station pool per task step) alongside the layout.
- **Tasks:** 37 mini-games. The Skeld: Fix Wiring, Swipe Card, Calibrate Distributor, Divert Power, Download/Upload Data, Align Engine, Stabilize Steering, Fuel Engines, Clear Asteroids, Empty Garbage, Submit Scan and Start Reactor. MIRA HQ adds Enter ID Code, Run Diagnostics (start it, come back a minute later), Water Plants, Buy Beverage, Measure Weather, Sort Samples, Assemble Artifact, Process Data, Unlock Manifolds, Clean O2 Filter, Prime Shields and Chart Course. Polus adds Insert Keys, Scan Boarding Pass, Align Telescope, Fill Canisters, Fix Weather Node, Monitor Tree, Open Waterways, Reboot Wifi, Record Temperature, Repair Drill, Replace Water Jug, Store Artifacts and Inspect Sample (Reboot Wifi and Inspect Sample make you come back after a minute).
- **Sabotage:** Lights, Reactor (Seismic Stabilizers on Polus), O2, Comms, and Doors (The Skeld and Polus).
- **Meetings:** emergency button and body reports, discussion and voting timers, meeting chat and ghost-only chat, skip votes, anonymous votes, confirm ejects.
- **Cutscenes:** role reveal, meeting splash, kill animation, ejection, and victory/defeat.
- **Settings:** the host controls the full lobby settings panel.
- **Cosmetics:** 18 colours and 21 hats, picked from the laptop or the 🎨 Customize button in the lobby.
- **Bots (beta):** the host can fill seats with **＋ Add bot** in the lobby (and remove one with ✕). Bots count toward the 4-player minimum. See [Bots](#bots).

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| E / Space | Use (tasks, consoles, emergency button, sabotage fixes) |
| Q | Kill |
| R | Report body |
| V | Vent / exit vent |
| F | Shapeshift / revert |
| Tab / M | Map (impostors: sabotage map) |
| Esc | Close panel |

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

`npm run dev` starts two processes:
- the game server on port 8790, with `DEV=1`;
- Vite on port 5173, which proxies `/ws` to the game server.

To play with several people on one machine, use several tabs. Each tab keeps its own seat, because the session token is stored in `sessionStorage`. Reloading a tab puts you back in your seat.

### Dev helpers (only when the server runs with `DEV=1`)

- **Solo start:** you can start a game with fewer than 4 players, and solo games skip the parity and last-impostor win checks.
- **Forced role:** choose a role from the **DEV role** dropdown in the lobby, or open `?role=impostor|crewmate|engineer|scientist|shapeshifter`.
- **Chat commands:** type these in a meeting or ghost chat (or send `{t:'dev', cmd}`):
  - `/tp <room>` — teleport to a room
  - `/noclip` — walk through walls
  - `/killcd` — reset your kill cooldown
  - `/sab lights|reactor|o2|comms` — start a sabotage
  - `/win crew|imp` — end the game
  - `/tasks` — complete your tasks
  - `/meeting` — start a meeting
  - `/die` — become a ghost
  - `/home` — go back to spawn
- **Simulated bad wifi:** start the dev server with `NET_LAG=80 NET_JITTER=400 npm run dev` to add up to that much delay to every message (order preserved, like real TCP). The HUD shows a 📶 badge when the connection is slow.
- **`?debug` in the URL:** shows the map-authoring overlay (collision segments, room ids, vent links, station ids, camera views, doors). It also shows the world coordinates under the cursor; click to copy them.
  - `G` toggles fog.
  - `N` toggles noclip.

## Tests

```bash
npm test
npm run typecheck
```

- **`tests/shared`:** map integrity for every map (shutting a room's doors seals it, the admin table is reachable from all sides, every room and station reachable, pieces don't overlap, doors valid, vent links symmetric, MIRA HQ's single vent network, decon and sensors), deterministic movement and collision, visibility, voting, win conditions, roles, task assignment, sabotage.
- **`tests/server`:** a full scripted game with a fake clock. Anti-cheat checks: input flooding, out-of-range and through-wall kills, early task completion, invalid vent moves, and no leaks of roles, ghosts, distant players or votes. Network tests use real WebSocket clients, including reconnect. MIRA HQ tests cover the Launchpad start, decontamination, the door log, keypad comms and the Run Diagnostics wait; Polus tests cover manual doors, the seismic stabilizers, Reboot Wifi's wait and the admin map.
- **`tests/ui`:** every mini-game renders; the settings panel is read-only for non-hosts.

## Deploying

A single Node process serves the built client and the WebSocket on `PORT`:

```bash
npm run build
PORT=8080 npm start
```

Rooms live in memory, so **run exactly one instance**.

- **Render:** `render.yaml` is a ready Blueprint on the free plan. Free services sleep after about 15 minutes with no traffic: the next visit takes up to a minute to wake it, and any open rooms are lost. Switch to `plan: starter` to keep it always on.
- **Fly.io:** run `fly launch --no-deploy` (it picks up `fly.toml` and the `Dockerfile`), then `fly deploy`.
- **Railway:** detected automatically from `package.json`; the build and start scripts work as-is.
- **Any Docker host:** `docker build -t among-us . && docker run -p 8080:8080 among-us`.

`/healthz` returns `ok` for health checks.

## Bots

> **Beta:** bots are experimental. They may get stuck on some corners, and they play a simple strategy.

Bots run on the server (`server/bots/`) and play through the same messages a browser sends, so every move is checked like a real player's. They only react to what their character could see.

- **Crewmates** walk to their tasks (A* over the map grid), fix sabotages (they split up for reactor and O2), open Polus doors, report bodies, and call the emergency button after seeing someone vent.
- **Impostors** pretend to do tasks, kill when nobody (or occasionally only one person) is watching, sometimes vent away, and sabotage.
- **Meetings:** bots say where they were and what they saw (a kill, a vent, who was near the body or last with the victim), defend themselves when accused, and vote from their evidence plus the accusations in chat. Impostors lie and never vote for each other.
- A room with only bots left is closed.

Meeting chat uses built-in lines by default, with no network calls. For more natural chat, set a **free-tier** LLM key on the server (it is never sent to clients). Put it in a `.env` file in the project root (copy `.env.example`; `.env` is git-ignored) or set it as a real environment variable, which takes precedence. The server logs which chat mode it's using at startup.

| Variable | Meaning |
| --- | --- |
| `BOT_LLM_KEY` | API key. Unset = built-in lines only. |
| `BOT_LLM_PROVIDER` | `groq` (default, free key at console.groq.com) or `gemini` (free key at aistudio.google.com). |
| `BOT_LLM_MODEL` | Override the model (defaults: `llama-3.1-8b-instant`, `gemini-2.0-flash`). |
| `BOT_LLM_RPM` | Requests per minute to stay under (defaults: 25 for Groq, 12 for Gemini). |

Requests time out after 4 s. If the key is missing, the free limit is reached, or the API fails, bots fall back to the built-in lines.

## How it works

- **`shared/`** is TypeScript used by both client and server.
  - Movement (`sim/movement.ts`) is a fixed-step, deterministic function.
  - Map compiler (`map/compile.ts`) turns room and hall rectangles and polygons (MIRA HQ's diagonal hallway and domed Greenhouse, Polus' octagonal Specimen Room) into exact wall segments and a spatial hash.
  - Visibility polygons (`sim/visibility.ts`).
  - Game rules (`rules/`).
- **`server/`** is authoritative and runs at 30 Hz.
  - Clients send only their inputs (direction plus a sequence number).
  - Each player gets their own filtered snapshot (`game/views.ts`). Crewmates never receive other players' roles, ghosts, venting players, far-away players, ghost chat, or individual votes before the results.
  - Every action (kill, report, task, vent, sabotage, fix) is validated on the server: range, cooldown, line of sight, and minimum task time.
- **`src/`** is the React HUD plus a Canvas 2D renderer.
  - The client predicts its own movement and reconciles it with the server's acknowledgements.
  - Other players are interpolated about 100 ms in the past.
  - Fog of war is a visibility polygon cut out of a dark overlay.

The name "Among Us" belongs to Innersloth. This is a fan project for personal and private use.
