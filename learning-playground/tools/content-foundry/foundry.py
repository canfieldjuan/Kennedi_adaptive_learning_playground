#!/usr/bin/env python3
"""Manual parent-side CLI. Decisions recorded here never publish content."""

from __future__ import annotations

import argparse
import json

from content_foundry import ContentFoundryService, FoundryConfig
from content_foundry.drafts import DraftStore


def main() -> int:
    parser = argparse.ArgumentParser(description="Kennedi Content Foundry")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("status")
    validate = subparsers.add_parser("validate-draft")
    validate.add_argument("draft_id")
    assemble = subparsers.add_parser("assemble")
    assemble.add_argument("storyboard_path")
    decide = subparsers.add_parser("record-decision")
    decide.add_argument("draft_id")
    decide.add_argument("decision", choices=("approved", "rejected"))
    decide.add_argument("--reviewer", required=True)
    decide.add_argument("--notes", default="")
    args = parser.parse_args()
    config = FoundryConfig.discover()
    if args.command == "record-decision":
        config.ensure_local_directories()
        result_value = DraftStore(config.drafts_root).record_parent_decision(args.draft_id, decision=args.decision, reviewer=args.reviewer, notes=args.notes)
    else:
        service = ContentFoundryService(config)
        if args.command == "status":
            result_value = service.status()
        elif args.command == "validate-draft":
            result_value = service.validate_draft(draft_id=args.draft_id)
        else:
            result_value = service.assemble_narrated_clip(storyboard_path=args.storyboard_path)
    print(json.dumps(result_value, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
