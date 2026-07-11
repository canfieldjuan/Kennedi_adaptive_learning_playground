# Production Art Assets Contract

## Purpose and Authority

This contract governs every substantial production illustration, character,
scene, prop family, texture, animation frame, and interface illustration added
to the playground. It supplements the game-specific visual contracts. When a
tool's export capability conflicts with ownership, redistribution, editable
source, local-first operation, or this contract, the stricter rule wins.

The design application is an authoring tool, never a runtime dependency. Every
approved production asset must render locally after export without an account,
proprietary viewer, hosted design, embed, third-party URL, or network request.

## Approved Authoring Tools

Original art may be produced in Figma, Affinity Designer, Inkscape, Adobe
Illustrator, Canva under the restrictions below, or a comparable vector editor
whose commercial-use and ownership terms are documented. Using an application
does not make its bundled resources project-owned.

The preferred workflow is:

1. Draw original vectors from basic shapes and paths.
2. Reuse only project-owned characters, palettes, and components.
3. Save the editable source under `design-source/`.
4. Export an optimized local production asset.
5. Record provenance and any third-party license before review.
6. Verify the export independently of the authoring application.

## Ownership Categories

Every production asset must have exactly one documented origin category.

### Category A: Original Project Artwork

Preferred. The project developer or a commissioned artist creates the work
specifically for this project and the project owner receives the rights needed
to modify, distribute, publish in a public repository, and use it commercially.
Examples include original paths, characters, scenes, props, textures,
compositions, and animation frames.

### Category B: Project-Owned Source Material

Allowed when provenance is preserved. Examples include existing original Bear
Cafe, Pip, food, word-card, owner-supplied drawing, or owner-created photo
assets. An adaptation must identify the source family and cannot erase an
existing attribution or restriction.

### Category C: Compatible Third-Party Material

Use only when necessary. Before incorporation, the exact license must expressly
permit all of the following:

- commercial use;
- modification;
- distribution as part of a software application;
- distribution in a public source repository;
- continued use after an authoring-tool subscription ends; and
- the actual export form and degree of extractability used by the app.

Required attribution and license text must be committed and linked from the
asset ledger. An unclear, missing, source-only, editorial, education-only,
personal-use, or non-redistributable license fails this category. Availability
inside an editor or permission to click Export is not evidence of compatibility.

## Canva Boundary

Canva may be used for moodboards, layout prototypes, composition experiments,
color exploration, owner look checks, designs made entirely from original
project-owned uploads, and original manual drawing that incorporates no Canva
library content.

Do not ship a Canva library element unless its specific source and current
license are documented and satisfy Category C. Canva Pro access does not make a
library illustration, icon, template, photo, character, decorative element,
font, or generated asset project-owned. Never export a library element as a
standalone SVG or PNG merely because the editor permits the export.

Production art must not contain Branded Content, Education-only Content,
Editorial-only Content, entertainment-brand material, templates used as the
game's identity, stock characters used as recurring characters, extractable
stock elements, or material that cannot be redistributed in this repository.

The ledger must distinguish original project uploads, Canva-provided licensed
content, third-party content surfaced through Canva, and generated content.
Only original project-owned material is recorded as project-owned artwork.

## Other Editor Resources

Figma Community files, plugins, icon libraries, stock vectors, fonts, brushes,
textures, templates, character kits, and generated additions retain their own
licenses. The same rule applies to Affinity, Inkscape, Illustrator, or any other
editor: importing a resource does not transfer ownership. Unverified resources
must not enter production exports.

## Editable Source

Every substantial visual asset must have editable source committed under
`design-source/`. Accepted source formats include `.fig`, `.afdesign`, `.svg`,
`.ai`, or another documented editable vector format. A flattened PNG alone is
not sufficient for art likely to need revision.

When practical, preserve a standards-based SVG source alongside a proprietary
source file so maintenance is not permanently tied to one vendor. Keep only the
approved source, reusable components, and necessary linked resources; omit
temporary exports, abandoned concepts, duplicate artboards, caches, and
unbounded source history.

Production exports remain under the application's established local asset
structure. Do not invent a second production asset tree because the source tree
exists.

## Asset Provenance Gate

`docs/art/asset-provenance.md` is the canonical ledger. Each asset or cohesive
family must record:

- asset and game name;
- production and editable-source paths;
- creator, creation date, and creation tool;
- origin category and all incorporated third-party resources;
- source URL and exact license when third-party;
- commercial-use, modification, software-distribution, and public-repository
  permissions;
- attribution requirements;
- AI assistance status; and
- restrictions, review state, and owner approval evidence.

An undocumented asset is not production-ready. A changed legacy asset must
receive a ledger entry before approval; this contract does not invent
provenance retroactively.

## AI-Assisted Artwork

Generative image tools are not the default production workflow. Before any AI
assistance is used, pause implementation and add an owner-approved contract
amendment documenting the tool, current commercial terms, output license or
ownership grant, disclosed training provenance, indemnification, protected
character or artist-imitation risk, source prompt, editability, and the owner's
explicit approval.

Never request a living artist's style, a branded studio style, a protected
character look, or a copy of another game. AI output is not assumed to be
exclusive or copyrightable. Approved generated concepts may remain private
references and be redrawn as original vectors; generated production output
still requires provenance and owner approval.

## Character Ownership

Recurring characters, including Pip, Bear family customers, Story Stage heroes,
and future Number Train conductors, must be original and reusable. Each character
family needs:

- an original silhouette, palette, facial construction, clothing, and props;
- stable naming and reusable editable components;
- multiple poses or a source construction capable of producing them; and
- a ledger entry covering creator, source, rights, and incorporated resources.

Do not base project identity on stock mascots, community character kits,
inadequately licensed templates, entertainment characters, close copies, or
generated franchise lookalikes.

## Graphics PR Delivery Gate

Every game graphics PR must include:

1. Editable source files.
2. Optimized production exports.
3. Updated provenance entries.
4. A visual contact sheet.
5. Desktop screenshots.
6. Mobile screenshots.
7. A complete third-party resource list.
8. The exact license for each third-party resource.
9. Confirmation that no unlisted stock or library element remains.
10. Confirmation that the game has no authoring-tool runtime dependency.

The PR work contract must name every behavior hook needed by the visual work.
Temporary exports, unused concepts, duplicated artboards, and unjustifiably
large source-history files do not belong in the PR.

## Export Standard

Prefer SVG for characters, backgrounds, props, interface illustrations, scene
components, and icons. Use raster formats only when they provide a documented
quality, complexity, or performance benefit.

Every export must:

- have a meaningful filename and correct view box or dimensions;
- render locally without the authoring application;
- contain no remote references, base64 blobs, proprietary font dependency, or
  unnecessary editor metadata;
- remove invisible abandoned layers and excessive path/decimal complexity;
- preserve responsive composition and accessibility boundaries;
- avoid child instructions baked into inaccessible paths; and
- remain within the game's measured mobile and performance budget.

Fixed decorative text may be converted to paths only when wording is immutable
and accessibility does not depend on it. Child instructions remain semantic DOM
or accessible UI, never illustration-only text.

## Runtime and Gameplay Boundary

A graphics pass may add local scene layers, original illustrations, asset
loaders, narrow scene components, responsive scene styling, bounded transitions,
state-specific poses, provenance documentation, and the minimum declared visual
state hook.

It must not change correct answers, evaluation, event timing, evidence, mastery,
curriculum, difficulty, child routes, parent behavior, persistence, or completion
semantics. Decorative art stays non-interactive, `aria-hidden` where appropriate,
unable to intercept taps, and covered by the existing game-environment safety,
mobile, reduced-motion, and performance rules.

## Look Approval Before Rollout

Begin each game's production-art pass with one representative proof scene. For
Bear Cafe, the proof is the delivery and pickup-window scene. The proof PR must
provide editable source, production export, desktop and mobile captures, an
existing-versus-proposed comparison, contact sheet, and provenance entry.

Do not extend the style across the remaining game until the owner approves the
illustration style, scene density, character scale, line weight, palette,
background contrast, mobile crop, and environmental richness. Green CI proves
code integrity, not art-direction approval.
