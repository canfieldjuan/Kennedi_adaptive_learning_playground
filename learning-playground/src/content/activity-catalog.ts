import type { LearningActivity } from '../types/activity';
import artColorCircleCoolColors from './activities/art-color-circle-cool-colors.json';
import artColorCircle from './activities/art-color-circle.json';
import mathCountHeartsThree from './activities/math-count-hearts-three.json';
import mathCountStarsThree from './activities/math-count-stars-three.json';
import phonicsFindBBall from './activities/phonics-find-b-ball.json';
import phonicsFindB from './activities/phonics-find-b.json';
import shapesFindCircleHeart from './activities/shapes-find-circle-heart.json';
import shapesFindCircle from './activities/shapes-find-circle.json';
import videoVault from './activities/video-vault.json';

export const APPROVED_ACTIVITIES: LearningActivity[] = [
  phonicsFindB,
  phonicsFindBBall,
  shapesFindCircle,
  shapesFindCircleHeart,
  mathCountStarsThree,
  mathCountHeartsThree,
  artColorCircle,
  artColorCircleCoolColors,
  videoVault,
] as LearningActivity[];
