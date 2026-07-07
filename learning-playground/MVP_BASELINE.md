# MVP Baseline

Version: v0.2.1 Phase 3.5 transfer coverage baseline

## Current Working MVP

The Learning Playground is a local-first adaptive learning playground for a preschool child. The current MVP has a child home shell, four large child choices, playable activities, a local Video Vault shell, a parent panel, local attempt logging, local progress tracking, and parent-controlled export/reset.

## Child Modules

- Home shell with exactly four primary choices: Words, Videos, Math, Art.
- Words activity: tap-choice phonics activity for initial sound recognition.
- Math activity: tap-choice counting/subitizing activity.
- Art activity: tap-fill coloring activity.
- Video Vault: parent-approved local video shell, currently empty until local video assets are added.
- Puzzle activity remains registered and reachable by direct route, but is not currently on the four-slot home grid.

## Parent Modules

- Parent Panel behind a visible local parent check.
- Settings summary for display name, difficulty mode, session length, audio, speech, video, and enabled domains.
- Local progress summary by skill.
- Parent-readable session review with completed activities, skills touched, accuracy by skill, hints used, abandoned activities, most repeated activity, recent attempts, parent-approved guidance evidence, applied-fit review, and parent notes.
- Parent Guidance with plain-language status and parent-controlled recommendations by reviewed skill.
- Parent Guidance includes skill graph evidence, mastery status, suggested next action, evidence summary, graph rule, and source references.
- Local progress export and reset.
- Local parent gate phrase setting.
- Active parent-approved guidance state by skill, applied only to supported tap-choice activities.
- Applied Guidance Review summarizes local attempts after active guidance affects a supported activity.
- Curriculum graph and mastery engine reason over prerequisites, transfer, retention, and review timing.
- Transfer Coverage shows when a skill is fluent in one context, ready for transfer, or blocked by missing approved transfer content.
- Parent transfer content decisions are stored locally and included in export.

## Local Data

- Parent settings are stored in localStorage.
- Activity attempt events are stored in localStorage.
- Attempt events include prompt text, selected answer, correct answer, response time, hint usage, and outcome.
- Pre-v0.1.1 local attempt events are migrated on read rather than dropped.
- Progress profiles are derived from local activity events and stored in localStorage.
- Parent observations are stored in localStorage and included in export.
- Parent difficulty action history and active guidance state are stored in localStorage and included in export.
- Attempt event metadata records when parent-approved guidance affected a supported activity.
- Applied-fit review is derived from local event metadata and active guidance records.
- Mastery evidence is derived from local events and parent observations, with source IDs cited.
- Transfer coverage and parent transfer decisions are local-first and export with progress data.
- Export includes metadata, app baseline/version, section list, and local data health.
- Child data does not leave the device by default.

## Safety Baseline

- No backend services.
- No public accounts.
- No cloud analytics.
- No open web search.
- No external child-facing links.
- No open YouTube.
- No ads, feeds, comments, chat, upload forms, or social sharing.
- No autoplay chains.
- No generative AI output is shown directly to the child.

## Activity Runtime Baseline

- Existing game types only: tap choice, coloring, and local video vault shell.
- Activities conform to the existing activity schema.
- Supported tap-choice activities can receive a bounded runtime copy from active parent-approved guidance; source activity JSON is not mutated.
- Wrong answers guide gently and do not remove progress.
- Completion remains short and returns control to the child or parent.

## v0.1.1 Hardening Scope

- Preserve the working MVP.
- Improve baseline documentation.
- Strengthen local event logging.
- Add parent observation storage.
- Add parent session review.
- Add parent-readable activity titles and recent attempts.
- Add parent interpretation and parent-only recommendations.
- Add export metadata and local data health.
- Add tests for event logging and observation storage.
- Add tests for review formatting, interpretation, and export structure.

## Intentional Non-Goals

- No new game types.
- No backend services.
- No schema expansion unless strictly required.
- No automatic adaptive routing.
- No hidden difficulty changes without parent approval.
- No rewards, streaks, leaderboards, or pressure loops.
