import { describe, expect, it } from 'vitest';
import { createScreenshotSeedPayload, screenshotFixtureIds } from '../utils/screenshotFixtures';

describe('screenshot fixtures', () => {
  it('builds English screenshot data with stable ids and light mode settings', () => {
    const payload = createScreenshotSeedPayload('en-US', new Date('2026-03-31T09:00:00.000Z'));

    expect(payload.settings.language).toBe('en');
    expect(payload.settings.themeMode).toBe('light');
    expect(payload.settings.onboardingCompleted).toBe(1);
    expect(payload.lists.map((list) => list.id)).toContain(screenshotFixtureIds.lists.focus);
    expect(payload.tasks.map((task) => task.id)).toContain(screenshotFixtureIds.tasks.quarterlyReview);
  });

  it('builds Turkish screenshot data with localized copy', () => {
    const payload = createScreenshotSeedPayload('tr', new Date('2026-03-31T09:00:00.000Z'));
    const focusList = payload.lists.find((list) => list.id === screenshotFixtureIds.lists.focus);
    const keyTask = payload.tasks.find((task) => task.id === screenshotFixtureIds.tasks.quarterlyReview);

    expect(payload.settings.language).toBe('tr');
    expect(focusList?.name).toBe('Odak');
    expect(keyTask?.title).toBe('Ceyrek planini takip et');
  });
});
