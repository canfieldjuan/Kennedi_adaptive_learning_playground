import type { LearningActivity } from '../types/activity';
import artColorCircle from './activities/art-color-circle.json';
import mathCountStarsThree from './activities/math-count-stars-three.json';
import phonicsFindB from './activities/phonics-find-b.json';
import shapesFindCircle from './activities/shapes-find-circle.json';
import videoVault from './activities/video-vault.json';

export const APPROVED_ACTIVITIES: LearningActivity[] = [
  phonicsFindB,
  shapesFindCircle,
  mathCountStarsThree,
  artColorCircle,
  videoVault,
] as LearningActivity[];
