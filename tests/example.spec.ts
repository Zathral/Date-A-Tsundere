import { expect, test } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const appUrl = pathToFileURL(path.resolve(process.cwd(), 'index.html')).toString();

const REPLY = '<n>Rain taps the window. Yui glances over.</n><s>W-what are you staring at?</s><t></t><m>{"emotion":"flustered","affection_delta":1,"memory":"likes ramen","emote":"blush"}</m>';

// Pretend to be Google: key check + streamed reply
const stubGemini = (withKey: boolean) => async (page: any) => {
  await page.addInitScript(([reply, withKey]: [string, boolean]) => {
    if (withKey) localStorage.setItem('tsun.apiKey', 'test-key');
    const real = window.fetch.bind(window);
    window.fetch = (url: any, opts?: any) => {
      const u = String(url);
      if (!u.includes('generativelanguage.googleapis.com')) return real(url, opts);
      if (u.includes('/models?')) return Promise.resolve(new Response('{}'));
      const body = 'data: ' + JSON.stringify({ candidates: [{ content: { parts: [{ text: reply }] } }] }) + '\n\n';
      return Promise.resolve(new Response(body, { headers: { 'content-type': 'text/event-stream' } }));
    };
  }, [REPLY, withKey]);
};

test('dashboard self-test passes', async ({ page }) => {
  const errors: string[] = [];
  await stubGemini(true)(page);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    const text = m.text();
    if (m.type() === 'error' && !text.includes('ERR_NETWORK_ACCESS_DENIED')) errors.push(text);
  });
  await page.goto(`${appUrl}?reset=1&selftest=1`);
  await expect(page.locator('body')).toHaveAttribute('data-selftest', 'passed');
  expect(errors).toEqual([]);
});

test('ambient effects preserve the reference layout', async ({ page }) => {
  await stubGemini(true)(page);
  await page.goto(`${appUrl}?reset=1`);
  await page.waitForTimeout(1800);
  const result = await page.evaluate(() => {
    const box = (s: string) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r && { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const hit = (a: any, b: any) => !!(a && b && a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y);
    const mood = box('.mood-chip');
    return {
      petals: document.querySelectorAll('.fx.petal').length,
      overlaps: ['.stat.energy', '.stat.rank', '.mission-card', '.event-card'].filter(s => hit(mood, box(s)))
    };
  });
  expect(result.petals).toBeGreaterThan(0);
  expect(result.overlaps).toEqual([]);
});

test('game asks for an API key before playing', async ({ page }) => {
  await stubGemini(false)(page);
  await page.goto(`${appUrl}?reset=1`);
  await expect(page.locator('#gate')).toBeVisible();
  await page.locator('#gateKey').fill('AIza-test');
  await page.locator('#gateGo').click();
  await expect(page.locator('#gate')).toBeHidden();
});

test('chat is a story page and Yui replies', async ({ page }) => {
  await stubGemini(true)(page);
  await page.goto(`${appUrl}?reset=1&selftest=1`);
  await page.getByRole('button', { name: 'Chat' }).click();
  await expect(page.locator('#storyPage')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Story with Yui' })).toBeVisible();
  await expect(page.locator('#log .entry.yui')).toHaveCount(1);        // opening scene
  await page.locator('#said').fill('*waves* I like ramen');
  await page.locator('#sendBtn').click();
  await expect(page.locator('#log .entry.yui')).toHaveCount(2);
  await expect(page.locator('#staminaText')).toHaveText('2/20');
  await page.locator('#storyPage').getByRole('button', { name: 'Home' }).click();
  await expect(page.locator('#storyPage')).toBeHidden();
});

test('menu switches the whole game to Japanese', async ({ page }) => {
  await stubGemini(true)(page);
  await page.goto(`${appUrl}?reset=1`);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: '日本語' }).click();
  await expect(page.locator('.nav-btn[data-route="/chat"]')).toHaveText('チャット');
});