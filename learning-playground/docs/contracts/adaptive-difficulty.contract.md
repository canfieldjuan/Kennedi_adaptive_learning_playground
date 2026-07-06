# Adaptive Difficulty Contract

## Goal
Adjust challenge based on recent mastery without creating pressure, addiction, or frustration.

## Promotion rule
Promote skill level when:
- recent accuracy >= 80%
- minimum recent attempts >= 5
- average response time is not extremely slow
- no repeated hint dependency
- child completed without visible frustration, if parent notes are available

## Review rule
Keep level stable when:
- recent accuracy is between 50% and 79%
- child needs hints but still completes
- response time is improving

## Support rule
Lower difficulty or add scaffolding when:
- recent accuracy < 50%
- child abandons twice in a row
- same wrong answer repeats
- parent marks activity as frustrating

## Difficulty knobs
- choice_count
- distractor_strength
- prompt_complexity
- visual_similarity
- time_pressure_enabled
- hint_level
- required_sequence_length

## Forbidden knobs
- No streak pressure
- No countdown timers by default
- No loss animations
- No shame language
- No random reward jackpot
