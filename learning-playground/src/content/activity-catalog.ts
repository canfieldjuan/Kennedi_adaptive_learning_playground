import type { LearningActivity } from '../types/activity';
import artColorCircleCoolColors from './activities/art-color-circle-cool-colors.json';
import artColorCircle from './activities/art-color-circle.json';
import kennedisOrdersBanana from './activities/kennedis-orders-banana-001.json';
import kennedisOrdersBFoods from './activities/kennedis-orders-b-foods-001.json';
import kennedisOrdersFixBerries from './activities/kennedis-orders-fix-berries-001.json';
import kennedisOrdersFreeMake from './activities/kennedis-orders-free-make-001.json';
import kennedisOrdersPinkBerries from './activities/kennedis-orders-pink-berries-001.json';
import kennedisOrdersTwoCookies from './activities/kennedis-orders-two-cookies-001.json';
import mathCountHeartsThree from './activities/math-count-hearts-three.json';
import mathCountStarsThree from './activities/math-count-stars-three.json';
import natureCameraAlbumReview from './activities/nature-camera-album-review.json';
import natureCameraBirdPhoto from './activities/nature-camera-bird-photo.json';
import natureCameraBSoundSafari from './activities/nature-camera-b-sound-safari.json';
import natureCameraCountTwoBirds from './activities/nature-camera-count-two-birds.json';
import natureCameraFreePictureWalk from './activities/nature-camera-free-picture-walk.json';
import natureCameraSquirrelPhoto from './activities/nature-camera-squirrel-photo.json';
import phonicsFindBBall from './activities/phonics-find-b-ball.json';
import phonicsFindB from './activities/phonics-find-b.json';
import shapesFindCircleHeart from './activities/shapes-find-circle-heart.json';
import shapesFindCircle from './activities/shapes-find-circle.json';
import videoVault from './activities/video-vault.json';

export const APPROVED_ACTIVITIES: LearningActivity[] = [
  kennedisOrdersBanana,
  kennedisOrdersTwoCookies,
  kennedisOrdersPinkBerries,
  kennedisOrdersBFoods,
  kennedisOrdersFixBerries,
  kennedisOrdersFreeMake,
  natureCameraFreePictureWalk,
  natureCameraBirdPhoto,
  natureCameraSquirrelPhoto,
  natureCameraCountTwoBirds,
  natureCameraBSoundSafari,
  natureCameraAlbumReview,
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
