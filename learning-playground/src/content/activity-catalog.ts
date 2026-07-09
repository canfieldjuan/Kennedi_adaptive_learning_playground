import type { LearningActivity } from '../types/activity';
import artColorCircleCoolColors from './activities/art-color-circle-cool-colors.json';
import artColorCircle from './activities/art-color-circle.json';
import blendBat from './activities/blend-bat.json';
import blendCat from './activities/blend-cat.json';
import blendHat from './activities/blend-hat.json';
import kennedisOrdersBanana from './activities/kennedis-orders-banana-001.json';
import kennedisOrdersBFoods from './activities/kennedis-orders-b-foods-001.json';
import kennedisOrdersFixBerries from './activities/kennedis-orders-fix-berries-001.json';
import kennedisOrdersFreeMake from './activities/kennedis-orders-free-make-001.json';
import kennedisOrdersPinkBerries from './activities/kennedis-orders-pink-berries-001.json';
import kennedisOrdersTwoCookies from './activities/kennedis-orders-two-cookies-001.json';
import mathCountHeartsThree from './activities/math-count-hearts-three.json';
import mathCountStarsThree from './activities/math-count-stars-three.json';
import mathDotCardThree from './activities/math-dot-card-three.json';
import phonicsBananaStartingLetter from './activities/phonics-banana-starting-letter.json';
import phonicsFindBBall from './activities/phonics-find-b-ball.json';
import phonicsFindB from './activities/phonics-find-b.json';
import phonicsFindC from './activities/phonics-find-c.json';
import phonicsFindM from './activities/phonics-find-m.json';
import phonicsFindS from './activities/phonics-find-s.json';
import phonicsFindT from './activities/phonics-find-t.json';
import shapesFindCircleHeart from './activities/shapes-find-circle-heart.json';
import shapesFindCircle from './activities/shapes-find-circle.json';
import videoVault from './activities/video-vault.json';

export const APPROVED_ACTIVITIES: LearningActivity[] = [
  phonicsFindB,
  // Ordered after the reverse_mapping (banana) activity on purpose: the transfer
  // recommendation engine picks the first uncovered-context activity by array
  // order, so keeping these same_format_new_examples cards after banana preserves
  // the existing "rich transfer activity" recommendation. See PR note on ranking.
  phonicsBananaStartingLetter,
  phonicsFindBBall,
  phonicsFindM,
  phonicsFindS,
  phonicsFindC,
  phonicsFindT,
  blendCat,
  blendHat,
  blendBat,
  shapesFindCircle,
  shapesFindCircleHeart,
  mathCountStarsThree,
  mathDotCardThree,
  mathCountHeartsThree,
  artColorCircle,
  artColorCircleCoolColors,
  kennedisOrdersBanana,
  kennedisOrdersTwoCookies,
  kennedisOrdersPinkBerries,
  kennedisOrdersBFoods,
  kennedisOrdersFixBerries,
  kennedisOrdersFreeMake,
  videoVault,
] as LearningActivity[];
