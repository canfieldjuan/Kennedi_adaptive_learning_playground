import type { LearningActivity } from '../types/activity';
import artColorCircle from './activities/art-color-circle.json';
import mathCountStarsThree from './activities/math-count-stars-three.json';
import phonicsFindB from './activities/phonics-find-b.json';
import shapesFindCircle from './activities/shapes-find-circle.json';
import videoVault from './activities/video-vault.json';

const MVP_ACTIVITIES = [
  artColorCircle,
  mathCountStarsThree,
  phonicsFindB,
  shapesFindCircle,
  videoVault,
] as LearningActivity[];

export const ACTIVITY_TITLE_LOOKUP: Record<string, string> = Object.fromEntries(
  MVP_ACTIVITIES.map((activity) => [activity.id, activity.title])
);
