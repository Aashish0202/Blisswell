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
  await page.goto('http://localhost:3005/orders', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  // click the first Buy Now
  const buyBtns = await page.$$('button.btn-primary.btn-sm');
  console.log('buy buttons:', buyBtns.length);
  if (buyBtns.length) {
    await buyBtns[0].click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'C:/blisswell_new/.shots/modal_owned.png' });
    console.log('modal screenshot taken');
  }
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
