# Among Us (web)

A browser-based Among Us clone with real-time online multiplayer. Everything is drawn in code: no image or audio assets.

- **Online rooms:** 6-letter room codes and invite links (`?room=CODE`), up to 15 players, up to 3 impostors.
- **Roles:** Crewmate and Impostor, plus optional Engineer (vents), Scientist (portable vitals) and Shapeshifter.
- **Map:** one ship with 14 rooms, hallways, doors, 4 vent networks, 4 security cameras, and admin and vitals consoles.
- **Tasks:** 12 mini-games — Fix Wiring, Swipe Card, Calibrate Distributor, Divert Power, Download/Upload Data, Align Engine, Stabilize Steering, Fuel Engines, Clear Asteroids, Empty Garbage, Submit Scan and Start Reactor.
- **Sabotage:** Lights, Reactor, O2, Comms, and Doors.
- **Meetings:** emergency button and body reports, discussion and voting timers, meeting chat and ghost-only chat, skip votes, anonymous votes, confirm ejects.
- **Cutscenes:** role reveal, meeting splash, kill animation, ejection, and victory/defeat.
- **Settings:** the host controls the full lobby settings panel.

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
- **`?debug` in the URL:** shows the map-authoring overlay (collision segments, room ids, vent links, station ids, camera views, doors). It also shows the world coordinates under the cursor; click to copy them.
  - `G` toggles fog.
  - `N` toggles noclip.

## Tests

```bash
npm test
npm run typecheck
```

- **`tests/shared`:** map integrity (every room and station reachable, doors valid, vent links symmetric), deterministic movement and collision, visibility, voting, win conditions, roles, task assignment, sabotage.
- **`tests/server`:** a full scripted game with a fake clock. Anti-cheat checks: input flooding, out-of-range and through-wall kills, early task completion, invalid vent moves, and no leaks of roles, ghosts, distant players or votes. Network tests use real WebSocket clients, including reconnect.
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

## How it works

- **`shared/`** is TypeScript used by both client and server.
  - Movement (`sim/movement.ts`) is a fixed-step, deterministic function.
  - Map compiler (`map/compile.ts`) turns room and hall rectangles into wall segments and a spatial hash.
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
