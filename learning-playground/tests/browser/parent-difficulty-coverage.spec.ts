import { expect, test } from '@playwright/test';

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);
const RANDOM_VALUE = 0.123456;
const SESSION_ID = `sess-${NOW.toString(36)}-${RANDOM_VALUE
  .toString(36)
  .substring(2, 8)}`;

test('Parent Guidance identifies an uncovered stored current rung as an app content gap', async ({
  page,
}) => {
  await page.addInitScript(({ now, randomValue, sessionId }) => {
    Date.now = () => now;
    Math.random = () => randomValue;
    localStorage.setItem('lp_parent_settings', JSON.stringify({
      parent_gate_enabled: false,
    }));
    localStorage.setItem('lp_child_progress_profile', JSON.stringify({
      child_id: 'local-child',
      profile_version: 2,
      created_at: '2026-01-01T11:00:00.000Z',
      updated_at: '2026-01-01T12:00:00.000Z',
      skill_mastery: {
        subitizing: {
          skill_id: 'subitizing',
          current_level: 2,
          confidence: 0.8,
          total_attempts: 5,
          correct_attempts: 5,
          recent_accuracy: 1,
          recent_average_response_ms: 1000,
          last_seen_at: '2026-01-01T12:00:00.000Z',
          needs_review: false,
        },
      },
      session_summary: [],
    }));
    localStorage.setItem('lp_activity_events', JSON.stringify(
      [1, 2, 3, 4].map((attempt) => ({
        event_id: `event-${attempt}`,
        session_id: sessionId,
        child_id: 'local-child',
        activity_id: 'math-count-stars-three',
        activity_version: 1,
        skill_ids: ['subitizing'],
        timestamp: `2026-01-01T12:00:0${attempt}.000Z`,
        prompt_text: 'How many stars?',
        outcome: 'correct',
        selected_choice_id: 'three',
        correct_choice_id: 'three',
        selected_answer: '3',
        correct_answer: '3',
        attempt_number: attempt,
        response_time_ms: 1000,
        difficulty_level: 2,
        choice_count: 3,
        distractor_strength: 'medium',
        input_type: 'tap',
        hint_shown: false,
      }))
    ));
  }, { now: NOW, randomValue: RANDOM_VALUE, sessionId: SESSION_ID });

  await page.goto('/#parent');

  const guidance = page.locator('.parent-guidance-row').filter({
    hasText: 'Subitizing',
  });
  await expect(guidance).toContainText('Difficulty Coverage');
  await expect(guidance).toContainText('Blocked by content gap');
  await expect(guidance).toContainText('Recognizes quantities in new layouts');
  await expect(guidance).toContainText('Difficulty Band');
  await expect(guidance).toContainText('4-5');
  await expect(guidance).toContainText('Approved Activities');
  await expect(guidance).toContainText('0');
  await expect(guidance).toContainText(
    'This is a content gap in the app, not a judgment about the child.'
  );
  await expect(guidance).not.toContainText(/behind|failing|unable/i);
});
