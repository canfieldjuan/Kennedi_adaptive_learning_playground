# Safety Contract

## Child mode must never expose
- External links
- Search bars for web content
- Open YouTube
- Ads
- Comment sections
- Chat boxes
- Upload forms
- Public sharing
- Unreviewed AI output
- Autoplay chains
- Infinite scroll
- Social sharing
- Leaderboards
- Streak pressure
- Random reward loops

## Child mode may expose
- Approved local videos
- Approved images
- Approved audio
- Approved activities
- Parent-created content packs

## Parent gate
Parent panel must require one of:
- passcode
- long press sequence
- hidden gesture
- device-level guided access exit

## Media rule
Every video must be:
- locally hosted or parent-approved
- manually started
- finite
- followed by return/home/action choice

## Content validation rules
- All child activities must set `external_links_allowed: false`
- All child activities must set `requires_parent_approval: true`
- Child activity content must not contain `http://` or `https://`
- Content created by AI must not appear in child mode unless parent approved
