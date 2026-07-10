# Mobile Child UI Contract

## Purpose

Primary child gameplay should fit in one mobile viewport when reasonable.

This is not an absolute rule. If fitting everything would make controls cramped, tiny, confusing, or unsafe for a preschool child, scrolling is allowed. The goal is to remove avoidable UI noise, not to squeeze the child experience.

## Product Rule

The app adapts cognitive difficulty upward while keeping physical interaction and emotional feedback preschool-safe.

## Mobile Layout Principle

Use this structure for child gameplay screens:

```txt
compact top utility strip
main play scene
bottom action tray
compact feedback layer
```

## Compact Top Utility Strip

The top strip may include:

- home icon
- repeat prompt icon when a spoken prompt exists
- a small progress indicator when useful

The top strip must avoid:

- large page titles
- long visible prompts
- multiple text buttons
- parent/debug labels
- evidence language

## Main Play Scene

The main scene should show the current goal visually where possible:

- character
- order ticket
- scene/card/camera/canvas
- current target
- simple objects or icons

Gameplay must not require reading when a visual or spoken prompt can carry the instruction.

## Bottom Action Tray

The action tray should keep primary child choices reachable:

- 4-6 primary child choices when possible
- large forgiving tap targets
- comfortable spacing
- horizontal scroll only when safer than shrinking targets

Do not shrink controls below safe child size just to avoid scroll.

## Feedback

Feedback should be short, visual first, and speech-supported.

Prefer:

- small overlay or bubble
- character reaction
- item animation
- toast-style short text

Avoid feedback blocks that push the whole play scene down.

## Scroll Rules

Avoid unnecessary vertical scroll for:

- a single game round
- tap-choice prompt plus choices
- Kennedi's Orders active order
- active photo/camera target
- basic completion moments

Scroll is allowed for:

- parent panel
- data/export/history screens
- long review summaries
- content lists and catalogs
- art canvas when needed
- screens with intentional exploration

## Safety Rules

- No tiny touch targets.
- No dense grids of small controls.
- No child-facing debug or evidence text.
- No required reading for gameplay.
- No forced above-the-fold layout that makes the UI cramped.
- Parent and review screens may remain scrollable.

## Manual QA Checklist

On small phone, large phone, small tablet, and landscape:

- Can the child see the current goal without scrolling?
- Can the child reach primary choices without scrolling?
- Are Home and Repeat visible but not dominant?
- Are tap targets still large enough?
- Is the play scene visible?
- Does feedback avoid pushing the whole layout down?
- Does completion fit or scroll only lightly?
- Does the parent panel still scroll normally?
- Does landscape behave acceptably?

