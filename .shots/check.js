const pw = require('C:/Users/vmcs/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
(async () => {
  const browser = await pw.chromium.launch();
  const ctx0 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p0 = await ctx0.newPage();
  await p0.goto('http://localhost:3005/login', { waitUntil: 'networkidle' });
  await p0.fill('input[name="user_id"], input[type="text"]', 'BSW443680');
  await p0.fill('input[type="password"]', 'Test@1234');
  await p0.click('button[type="submit"]');
  await p0.waitForTimeout(2500);
  const storage = await p0.evaluate(() => ({ token: localStorage.getItem('token'), user: localStorage.getItem('user') }));
  await ctx0.close();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript((s) => { localStorage.setItem('token', s.token); localStorage.setItem('user', s.user); }, storage);
  const page = await ctx.newPage();
  await page.goto('http://localhost:3005/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const label = document.querySelector('.stat-card-label');
    const sub = document.querySelector('.stat-card-sub');
    const cs = label ? getComputedStyle(label) : null;
    const cs2 = sub ? getComputedStyle(sub) : null;
    return { labelDisplay: cs && cs.display, subDisplay: cs2 && cs2.display };
  });
  console.log(JSON.stringify(info));
  await page.screenshot({ path: 'C:/blisswell_new/.shots/dashboard_cards2.png', clip: { x: 280, y: 360, width: 1000, height: 130 } });
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
