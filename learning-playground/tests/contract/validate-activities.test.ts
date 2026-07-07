/**
 * Contract tests: Validate all sample activities against the activity schema.
 *
 * Tests:
 * 1. All activities match the activity schema.
 * 2. No activity exceeds 300 seconds.
 * 3. All child activities require parent approval.
 * 4. All child activities set external_links_allowed to false.
 */

import { describe, test, expect } from 'vitest';
import type { AnySchema } from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import activitySchema from '../../src/contracts/activity.schema.json';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import type { TransferContextType, TransferPromptMode } from '../../src/types/activity';

const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
const validate = ajv.compile(activitySchema as AnySchema);

interface ActivityJson {
  id: string;
  estimated_duration_seconds: number;
  skill_ids: string[];
  transfer: {
    skill_ids: string[];
    context_type: TransferContextType;
    context_id: string;
    example_set_id: string;
    prompt_mode: TransferPromptMode;
  };
  safety: {
    requires_parent_approval: boolean;
    external_links_allowed: boolean;
    contains_video?: boolean;
    contains_audio?: boolean;
  };
  [key: string]: unknown;
}

const allActivities = APPROVED_ACTIVITIES as unknown as ActivityJson[];

describe('activity schema contract', () => {
  test('all activities match the activity schema', () => {
    for (const activity of allActivities) {
      const valid = validate(activity);
      if (!valid) {
        console.error(`Activity "${activity.id}" failed validation:`, validate.errors);
      }
      expect(valid).toBe(true);
    }
  });

  test('no activity exceeds 300 seconds estimated duration', () => {
    for (const activity of allActivities) {
      expect(activity.estimated_duration_seconds).toBeLessThanOrEqual(300);
    }
  });

  test('all child activities require parent approval', () => {
    for (const activity of allActivities) {
      expect(activity.safety.requires_parent_approval).toBe(true);
    }
  });

  test('all child activities set external_links_allowed to false', () => {
    for (const activity of allActivities) {
      expect(activity.safety.external_links_allowed).toBe(false);
    }
  });

  test('every activity declares aligned transfer metadata', () => {
    for (const activity of allActivities) {
      expect(activity.transfer.context_type).toBeTruthy();
      expect(activity.transfer.context_id).toBeTruthy();
      expect(activity.transfer.example_set_id).toBeTruthy();
      expect(activity.transfer.prompt_mode).toBeTruthy();
      expect(activity.transfer.skill_ids).toEqual(activity.skill_ids);
    }
  });
});
