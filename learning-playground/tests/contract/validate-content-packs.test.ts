/**
 * Contract tests: Validate all content packs against the content-pack schema.
 *
 * Tests:
 * 1. All content packs match the content-pack schema.
 */

import { describe, test, expect } from 'vitest';
import type { AnySchema } from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import contentPackSchema from '../../src/contracts/content-pack.schema.json';
import animalsPack from '../../src/content/packs/animals.v1.json';
import shapesPack from '../../src/content/packs/shapes.v1.json';

const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
const validate = ajv.compile(contentPackSchema as AnySchema);

interface ContentPackJson {
  id: string;
  status: string;
  created_by: string;
  approved_by_parent: boolean;
  [key: string]: unknown;
}

const allPacks: ContentPackJson[] = [
  animalsPack as unknown as ContentPackJson,
  shapesPack as unknown as ContentPackJson,
];

describe('content pack schema contract', () => {
  test('all content packs match the content-pack schema', () => {
    for (const pack of allPacks) {
      const valid = validate(pack);
      if (!valid) {
        console.error(`Pack "${pack.id}" failed validation:`, validate.errors);
      }
      expect(valid).toBe(true);
    }
  });
});
