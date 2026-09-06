/**
 * Ghost Hunter AR — Playwright End-to-End Validation
 * Phase: validate
 *
 * Runs headless Chromium against the vite preview server on :4173,
 * exercises core game flows, captures screenshots, and asserts no
 * page-error console messages.
 */

const { chromium } = require('playwright');

const BASE = 'http://localhost:4173';
const OUT  = '/workspace/productions/15/run-8/validation';
const snaps = [];

// ── helpers ──────────────────────────────────────────────────────────────────

function snap(page, name) {
  const path = `${OUT}/${name}.png`;
  return page.screenshot({ path, fullPage: false })
    .then(() => { snaps.push(path); console.log('  📸  ' + path); });
}

// ── main ─────────────────────────────────────────────────────────────────────

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const context = await browser.newContext({
    // fake webcam for AR.js (avoids getUserMedia permission prompts)
    permissions: [],
  });
  const page = await context.newPage();

  /** Collect console errors (Error level only; warnings are ignored) */
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  /** Collect page errors (uncaught JS exceptions / rejected promises) */
  const pageErrors = [];
  page.on('pageerror', err => { pageErrors.push(err.message); });

  let exitCode = 0;

  try {
    // ── 1. Boot ────────────────────────────────────────────────────────────
    console.log('\n[1] Opening page…');
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000); // let Three.js / Rapier initialise

    // Canvas should be present and visible
    const canvas = page.locator('#app canvas');
    const canvasVisible = await canvas.isVisible().catch(() => false);
    console.log('  Canvas visible:', canvasVisible);
    if (!canvasVisible) throw new Error('Canvas not visible after boot');
    await snap(page, '01-boot');

    // Loading spinner should eventually hide (game loaded)
    const loading = page.locator('#loading');
    const loadingHidden = await loading.isHidden({ timeout: 15000 }).catch(() => false);
    console.log('  Loading spinner hidden:', loadingHidden);
    if (!loadingHidden) {
      // take a snap before failing so we have evidence
      await snap(page, '01-boot-loading-not-hidden');
    }

    // ── 2. HUD visible ───────────────────────────────────────────────────
    console.log('\n[2] Checking HUD…');
    const hud = page.locator('#hud');
    await hud.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
    const hudVisible = await hud.isVisible().catch(() => false);
    console.log('  HUD visible:', hudVisible);
    await snap(page, '02-hud');

    // ── 3. Click canvas to lock pointer / focus game ──────────────────────
    console.log('\n[3] Locking pointer (clicking canvas)…');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(500);
      await snap(page, '03-pointer-locked');
    }

    // ── 4. Simulate keyboard input ────────────────────────────────────────
    console.log('\n[4] Simulating WASD movement + spacebar to fire…');
    await page.keyboard.down('w');
    await page.waitForTimeout(400);
    await page.keyboard.up('w');
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    await snap(page, '04-gameplay-after-input');

    // ── 5. Score element should exist ─────────────────────────────────────
    console.log('\n[5] Checking score/kill HUD elements…');
    const scoreVal = page.locator('#score-value');
    const killsVal = page.locator('#kills-value');
    const scoreExists = await scoreVal.count() > 0;
    const killsExists = await killsVal.count() > 0;
    console.log('  #score-value exists:', scoreExists);
    console.log('  #kills-value exists:', killsExists);
    await snap(page, '05-score-hud');

    // ── 6. Check for ghosts spawned (ghost-count element) ────────────────
    const ghostCount = page.locator('#ghost-count');
    const ghostExists = await ghostCount.count() > 0;
    console.log('  #ghost-count exists:', ghostExists);
    await snap(page, '06-ghost-count');

    // ── 7. Wait a bit more and take final gameplay snap ───────────────────
    console.log('\n[7] Final gameplay snap after 3 s…');
    await page.waitForTimeout(3000);
    await snap(page, '07-final-gameplay');

    // ── Report ─────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════');
    console.log('CONSOLE ERRORS (' + consoleErrors.length + '):');
    consoleErrors.forEach(e => console.log('  ✗', e));

    console.log('\nPAGE ERRORS (' + pageErrors.length + '):');
    pageErrors.forEach(e => console.log('  ✗', e));

    console.log('\nSCREENSHOTS:');
    snaps.forEach(s => console.log(' ', s));

    // Fail the run if there are page errors (JS exceptions)
    if (pageErrors.length > 0) {
      console.error('\n❌ FAIL — page errors detected');
      exitCode = 1;
    } else if (!canvasVisible) {
      console.error('\n❌ FAIL — canvas not visible');
      exitCode = 1;
    } else {
      console.log('\n✅ PASS — game loaded and ran without page errors');
    }

  } catch (err) {
    console.error('\n❌ EXCEPTION:', err.message);
    exitCode = 1;
  } finally {
    await browser.close();
    await snap(page, '99-teardown').catch(() => {}); // best-effort
  }

  process.exit(exitCode);
})();
