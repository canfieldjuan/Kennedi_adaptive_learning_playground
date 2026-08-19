import { coverShell } from '../../components/layout.mjs';
import { bossKennedi } from '../../illustrations/boss-kennedi.mjs';
import { puppy, bird, cat } from '../../illustrations/animals.mjs';
import { paintbrushIcon, magnifyingGlassIcon } from '../../illustrations/icons.mjs';

export const meta = {
  pageNumber: 1,
  title: 'Kennedi Is The Boss',
  primarySkill: 'cover (no activity)',
  correctAnswers: {},
};

export function render() {
  const body = `
    <div class="cover-top">
      <p class="cover-eyebrow">My Preschool Adventure Book</p>
      <h1 class="cover-title"><span class="cover-title-line">KENNEDI</span><span class="cover-title-line">IS THE BOSS</span></h1>
      <p class="cover-subtitle">Learning Book 1</p>
      <p class="cover-tagline">Read &bull; Write &bull; Count &bull; Think &bull; Create</p>
    </div>
    <div class="cover-art">
      <div class="cover-helper" style="align-self:flex-start;">${bird('branch')}</div>
      <div class="cover-hero">${bossKennedi('hero', { crown: true, label: 'Boss Kennedi holding a clipboard and pencil' })}</div>
      <div class="col" style="gap:0.3in;">
        <div class="cover-helper">${puppy('happy')}</div>
        <div class="cover-helper" style="width:0.85in;">${cat('sleep')}</div>
      </div>
    </div>
    <div class="cover-bottom row" style="justify-content:space-between;">
      <span>My Preschool Adventure Book</span>
      <span class="row" style="gap:0.15in;">
        <span class="icon-inline" style="width:0.35in;height:0.35in;">${paintbrushIcon()}</span>
        <span class="icon-inline" style="width:0.35in;height:0.35in;">${magnifyingGlassIcon()}</span>
      </span>
    </div>
  `;
  return coverShell({ body });
}
