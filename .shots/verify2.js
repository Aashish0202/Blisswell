const pw = require('C:/Users/vmcs/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
(async () => {
  const browser = await pw.chromium.launch();
  // Register page (public)
  const p0 = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await p0.goto('http://localhost:3005/register', { waitUntil: 'networkidle', timeout: 30000 });
  await p0.waitForTimeout(1000);
  await p0.evaluate(() => window.scrollTo(0, 500));
  await p0.waitForTimeout(300);
  await p0.screenshot({ path: 'C:/blisswell_new/.shots/register_fields.png' });
  // click the first eye toggle to verify it reveals
  const btns = await p0.$$('.password-toggle-btn');
  console.log('toggle buttons found:', btns.length);
  if (btns.length >= 2) {
    await btns[0].click();
    const type = await p0.evaluate(() => document.querySelector('input[name="password"]').type);
    console.log('password field type after toggle:', type);
  }
  await p0.screenshot({ path: 'C:/blisswell_new/.shots/register_toggled.png' });
  await p0.close();
  // Dashboard cards
  const ctx0 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p1 = await ctx0.newPage();
  await p1.goto('http://localhost:3005/login', { waitUntil: 'networkidle' });
  await p1.fill('input[name="user_id"], input[type="text"]', 'BSW443680');
  await p1.fill('input[type="password"]', 'Test@1234');
  await p1.click('button[type="submit"]');
  await p1.waitForTimeout(2500);
  const storage = await p1.evaluate(() => ({ token: localStorage.getItem('token'), user: localStorage.getItem('user') }));
  await ctx0.close();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript((s) => { localStorage.setItem('token', s.token); localStorage.setItem('user', s.user); }, storage);
  const page = await ctx.newPage();
  await page.goto('http://localhost:3005/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'C:/blisswell_new/.shots/dashboard_cards3.png', clip: { x: 280, y: 360, width: 1000, height: 130 } });
  console.log('dashboard ok');
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
