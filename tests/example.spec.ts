import { expect, test } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const appUrl = pathToFileURL(path.resolve(process.cwd(), 'index.html')).toString();

test('dashboard self-test passes', async ({ page }) => {
  const errors: string[] = [];

  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    const text = message.text();
    if (message.type() === 'error' && !text.includes('ERR_NETWORK_ACCESS_DENIED')) {
      errors.push(text);
    }
  });

  await page.goto(`${appUrl}?reset=1&selftest=1`);
  await expect(page.locator('body')).toHaveAttribute('data-selftest', 'passed');

  const selftest = await page.evaluate(() => (
    window as unknown as {
      __selftest: {
        passed: boolean;
        result: Record<string, boolean>;
        missingRoutes: string[];
      };
    }
  ).__selftest);

  expect(selftest).toMatchObject({
    passed: true,
    result: {
      routes: true,
      dialogue: true,
      state: true,
      effects: true
    },
    missingRoutes: []
  });
  expect(errors).toEqual([]);
});

test('ambient effects preserve the reference layout', async ({ page }) => {
  await page.goto(`${appUrl}?reset=1`);
  await page.waitForTimeout(1800);

  const result = await page.evaluate(() => {
    const box = (selector: string) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect && { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    const overlaps = (
      a: ReturnType<typeof box>,
      b: ReturnType<typeof box>
    ) => !!(a && b && a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y);

    const mood = box('.mood-chip');
    return {
      petalCount: document.querySelectorAll('.fx.petal').length,
      moodDisplay: getComputedStyle(document.querySelector('.mood-chip') as Element).display,
      overlaps: [
        overlaps(mood, box('.stat.energy')) && 'energy',
        overlaps(mood, box('.stat.rank')) && 'rank',
        overlaps(mood, box('.mission-card')) && 'mission',
        overlaps(mood, box('.event-card')) && 'event'
      ].filter(Boolean)
    };
  });

  expect(result.petalCount).toBeGreaterThan(0);
  expect(result.moodDisplay).toBe('flex');
  expect(result.overlaps).toEqual([]);
});

test('chat route opens dedicated gameplay screen and home restores dashboard', async ({ page }) => {
  await page.goto(`${appUrl}?reset=1&selftest=1`);

  await page.getByRole('button', { name: 'Chat' }).click();
  await expect(page.getByTestId('chat-view')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Chat with Yui' })).toBeVisible();
  await expect(page.locator('.mission-card')).toBeHidden();
  await expect(page.locator('.event-card')).toBeHidden();

  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByTestId('chat-view')).toBeHidden();
  await expect(page.locator('.mission-card')).toBeVisible();
  await expect(page.locator('.event-card')).toBeVisible();
});

test('chat choices update affection, rewards, and mini state', async ({ page }) => {
  await page.goto(`${appUrl}?reset=1&selftest=1`);
  await page.getByRole('button', { name: 'Chat' }).click();

  await page.getByRole('button', { name: 'Tease back' }).click();
  await expect(page.locator('#staminaNumber')).toHaveText('13');
  await expect(page.locator('#staminaText')).toHaveText('5/10');
  await expect(page.getByTestId('chat-turns')).toHaveText('1');

  await page.getByRole('button', { name: 'Be sincere' }).click();
  await expect(page.locator('#staminaNumber')).toHaveText('15');
  await expect(page.locator('#coinCount')).toHaveText('55');
  await expect(page.getByTestId('chat-turns')).toHaveText('2');

  await page.getByRole('button', { name: 'Ask about lesson' }).click();
  await expect(page.locator('#rankText')).toHaveText('4/10');
  await expect(page.getByTestId('lesson-preview')).toHaveClass(/is-highlighted/);
  await expect(page.getByTestId('chat-turns')).toHaveText('3');

  const stored = await page.evaluate(() => ({
    affection: localStorage.getItem('tsun.affection'),
    stamina: localStorage.getItem('tsun.stamina'),
    rankProgress: localStorage.getItem('tsun.rankProgress'),
    chatTurns: localStorage.getItem('tsun.chatTurns')
  }));

  expect(stored).toEqual({
    affection: '15',
    stamina: '5',
    rankProgress: '4',
    chatTurns: '3'
  });
});

test('chat mini state stays inside stat bounds', async ({ page }) => {
  await page.goto(`${appUrl}?reset=1`);
  await page.evaluate(() => {
    localStorage.setItem('tsun.affection', '19');
    localStorage.setItem('tsun.stamina', '0');
    localStorage.setItem('tsun.rankProgress', '10');
  });
  await page.goto(appUrl);
  await page.getByRole('button', { name: 'Chat' }).click();

  await page.getByRole('button', { name: 'Be sincere' }).click();
  await page.getByRole('button', { name: 'Tease back' }).click();
  await page.getByRole('button', { name: 'Ask about lesson' }).click();

  await expect(page.locator('#staminaNumber')).toHaveText('20');
  await expect(page.locator('#staminaText')).toHaveText('0/10');
  await expect(page.locator('#rankText')).toHaveText('10/10');
});
