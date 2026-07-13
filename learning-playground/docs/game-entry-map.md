# Game Entry Map — where every game lives and what moving one touches

Written 2026-07-13 as the ground-truth survey for the "all games on the
home page" decision. Read-only findings; nothing here changes behavior.

## Entry surfaces today

There are exactly three ways a game can be reached:

1. **Child home grid** (`#home`) — the only child-discoverable surface.
2. **Parent Panel → Parent-Started Games** — parent taps Start.
3. **Direct URL** (`#activity/<id>` or `#story-stage`) — no in-app path.

### Child home grid (4 cards, contract-pinned)

| Card | Route | Chain it starts |
| --- | --- | --- |
| Words (pink) | `#activity/phonics-find-b` | find b → m → s → c → t → blend cat → hat → bat → build cat → dog → sun (11 activities) |
| Cafe (blue) | `#activity/kennedis-orders-banana-001` | banana → two cookies → pink berries → b foods → fix berries → free make (all 6) |
| Math (green) | `#activity/number-train` | number-train only (no chain) |
| Art (orange) | `#activity/art-studio-free-decorate` | free → pink → three stars → five flowers → pattern → fix → story → poster → wall picture → dress bear (10 activities) |

The 4-card shape is **pinned by two contract tests** — this is deliberate
("do not silently change the home-screen contract"):

- `tests/contract/child-home-cafe-entry.test.ts` — renders home, asserts
  exactly 4 cards, the four labels, and **no "Videos"**.
- `tests/contract/parent-game-launch.test.ts` — pins the HomeScreen
  SOURCE: exactly four `id: 'home-…'` entries, the labels, the cafe
  route, and no Videos.

Any home change is therefore a deliberate contract amendment, reviewed
as such. Precedent: **Videos used to be a home card and was deliberately
replaced by Cafe** — parent-started became its home on purpose.

### Parent-Started Games (Parent Panel)

| Card | Route | Notes |
| --- | --- | --- |
| Bear Cafe | `#activity/kennedis-orders-banana-001` | Same entry the home card uses. **The card's "Home Grid: Hidden" metric is STALE/WRONG** — Cafe has been on the home grid since it replaced Videos. Fix when next touching the panel. |
| Video Observation | `#activity/video-vault` | Start disabled unless `settings.video_enabled`. Evidence flow (exposure + response). |
| Story Stage | `#story-stage` | Own router view. No child-discoverable entry at all. |

### Direct-URL only (child-unreachable orphans)

13 of 45 activities have **no in-app path from any child surface**:

- **The entire shapes/Puzzle lane:** `shapes-find-circle`,
  `shapes-find-circle-heart`, `shapes-roof-in-scene`
- **Math tap-choice lane:** `math-count-hearts-three`,
  `math-count-stars-three`, `math-dot-card-three`
- **Number Train upper bands:** `number-train-express`,
  `number-train-summit` (the world-menu seam noted at v0.3.50)
- **Words variants:** `phonics-find-b-ball`,
  `phonics-banana-starting-letter`, `blend-listen-dog`, `build-model-map`
- **Legacy coloring:** `art-color-circle`,
  `art-color-circle-cool-colors`, `art-match-blue-card`

Some are deliberate (Cafe uses the phonics variants inside its own flow;
legacy coloring was superseded by the studio), but the shapes lane and
the train upper bands are real content a child cannot find. Any "give
every game a home" plan should decide these too — likely via per-game
hub/world menus rather than more home cards.

## Impact assessment: moving a game onto the child home

### Story Stage (the live request — proposal already exists)

`docs/proposals/story-stage-child-entry.md` recommends **Option A2: a
featured wide card** spanning both columns of the 2×2 grid (five equal
tiles was rejected — orphan-tile layout, shrunken tap targets). The
change surface, in full:

1. `src/modules/home/HomeScreen.ts` — fifth `HOME_OPTIONS` entry
   (route `#story-stage`, speechLabel, color).
2. `src/modules/home/home-icons.ts` — a story icon in the illustrated
   standard (compose from the shared component library; provenance
   ledger note per the art workflow).
3. `src/styles/child-ui.css` — the wide-card grid placement
   (`grid-column: 1 / -1`) + mobile sizing; keep home one-screen at
   390×844 (capture pass required, both viewports).
4. **Contract test amendments (deliberate):**
   `child-home-cafe-entry.test.ts` (4 → 5 cards + the new label) and
   `parent-game-launch.test.ts` (source pin 4 → 5 entries).
5. **Home backdrop art:** the home-room scene's reserved clear zone is
   the card-grid center (ledger: reserved zones are load-bearing). A
   fifth band grows the grid's footprint — verify by capture that it
   still sits inside the props-free zone; adjust the scene via the
   library + re-export if not.
6. **Voice pack lockstep:** a new spoken home label (e.g. "Story
   Time") changes the line enumeration → the voice-pack contract test
   fails by design until `build-voice-manifest` + `generate_voice_pack
   --only-missing` are re-run (one new Emma clip).
7. Parent Panel: keep the launch card (both entries can coexist);
   update its Entry metric; fix the stale Bear Cafe "Home Grid" metric
   in the same pass.
8. Safety contract: `#story-stage` is already child-safe by
   construction (no evidence sink is by design — creative play);
   nothing in the safety tests keys on how it is reached.

Estimated shape: small PR. The only genuinely new asset is the icon.

### Video Observation (assessed, NOT recommended)

Moving Videos back to home reverses a deliberate product decision (the
test literally asserts "no Videos on home"). It also inherits the
`video_enabled` gate: the card would have to appear/disappear with a
parent setting — a settings-dependent home, which is a new pattern with
its own test surface. If wanted, the honest shape is: card visible only
when `video_enabled`, contract tests updated to assert both states.
Recommendation: leave it parent-started; it is an observation flow, not
a free-play game.

### The orphaned lanes (shapes, math tap-choice, train bands)

Putting these on home directly would blow past preschool choice limits
(`max_activity_choices` exists for a reason). The scalable shape is a
**world/hub layer**: each home card opens its game's small world menu
(e.g. Math world: Number Train + Express + Summit + counting cards),
which is also where Express/Summit's noted "world-menu seam" lands.
That is a bigger arc; this map just names it.

## Quick reference — "where does X live?"

| Game | Child home | Parent panel | Direct URL | Child-reachable? |
| --- | --- | --- | --- | --- |
| Words (phonics + builder) | ✔ card | — | ✔ | ✔ |
| Bear Cafe | ✔ card | ✔ Start | ✔ | ✔ |
| Number Train (core) | ✔ card | — | ✔ | ✔ |
| Number Train Express/Summit | — | — | ✔ only | ✘ |
| Bear Art Studio (9-chain) | ✔ card | — | ✔ | ✔ |
| Legacy coloring (3) | — | — | ✔ only | ✘ |
| Shapes lane (3) | — | — | ✔ only | ✘ |
| Math tap-choice (3) | — | — | ✔ only | ✘ |
| Story Stage | — | ✔ Start | ✔ (`#story-stage`) | ✘ (parent must start) |
| Video Observation | — (deliberately removed) | ✔ Start (gated) | ✔ | ✘ (parent must start) |
