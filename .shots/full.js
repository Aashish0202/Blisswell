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
  await page.screenshot({ path: 'C:/blisswell_new/.shots/dashboard_full.png', fullPage: true });
  // also dump any suspicious text nodes
  const suspicious = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('body *').forEach(el => {
      if (el.children.length === 0 && el.textContent && /^\s*0{2,}\s*$/.test(el.textContent)) {
        out.push({ tag: el.tagName, cls: el.className && el.className.toString().slice(0, 60), text: el.textContent.trim().slice(0, 30), parentCls: el.parentElement && el.parentElement.className.toString().slice(0, 60) });
      }
    });
    return out;
  });
  console.log(JSON.stringify(suspicious, null, 1));
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
