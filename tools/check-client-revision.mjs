/* Meaningful browser checks for the client revision. Run against the local preview. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const base = "http://127.0.0.1:5173";
const shots = fs.mkdtempSync(path.join(os.tmpdir(), "sihat-client-review-"));
let browser;
for (const channel of ["chrome", "msedge", undefined]) {
  try { browser = await chromium.launch(channel ? { channel } : {}); break; }
  catch (error) { if (!channel) throw error; }
}
const errors = [];
try {
  for (const width of [1440, 768, 360]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce", locale: "ru-RU" });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.url().startsWith(base) && response.status() >= 400) errors.push(response.status() + " " + response.url()); });
    for (const file of ["index.html", "direction.html", "prices.html", "patients.html"]) {
      await page.goto(base + "/" + file);
      await page.evaluate(() => document.fonts.ready);
      await page.locator('img[loading="lazy"]').evaluateAll(images => images.forEach(img => { img.loading = "eager"; }));
      await page.waitForFunction(() => [...document.images].every(img => img.complete));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${file}, ${width}: horizontal overflow`);
      assert.deepEqual(await page.evaluate(() => {
        const seen = new Set(); return [...document.querySelectorAll("[id]")].map(el => el.id).filter(id => seen.has(id) || !seen.add(id));
      }), [], `${file}: duplicate ids`);
      assert.deepEqual(await page.locator("img").evaluateAll(images => images.filter(img => !img.naturalWidth).map(img => img.src)), [], `${file}: broken images`);
      assert.equal(await page.locator("#cf-direction").count(), 0);
      assert.equal(await page.locator('#booking input[type="email"]').count(), 1);
      assert.equal(await page.locator(".site-top .social-link").evaluateAll(links => links.map(a => a.getAttribute("aria-label")).join(",")), "MAX,ВКонтакте");
      assert.deepEqual(await page.locator('a[href]:not([href="#"])').evaluateAll(links => links.map(a => a.getAttribute("href")).filter(href => href !== "index.html" && !/^prices\.html(?:[?#]|$)/.test(href))), [], "only home and price-list links are enabled");
      if (file === "index.html") {
        assert.equal(await page.locator(".home-directions .dcard").count(), 4);
        assert.equal(await page.locator(".patient-grid a").count(), 4);
        assert.equal(await page.locator(".doctor-card__rating").count(), 8);
        assert.equal(await page.locator('[data-home="reviews"] > li:not([data-scroller-copy]) .review-card').count(), 3);
        assert.equal(await page.locator(".callback-panel form").count(), 2);
        for (const form of await page.locator(".callback-panel form").all()) {
          await form.locator('[type="submit"]').click();
          assert.equal(await form.locator('[aria-invalid="true"]').count(), 2);
          await form.locator('[name="phone"]').fill("9271234567");
          await form.locator('[name="consent"]').check();
          await form.locator('[type="submit"]').click();
          assert.equal(await form.isVisible(), false);
          await form.locator("..").locator("[data-form-again]").click();
          assert.equal(await form.isVisible(), true);
        }
        assert.equal(await page.locator("[data-promo], [data-promo-trigger]").count(), 0, "the promotion and its extra link are removed");
        const track = page.locator("#reviews-track");
        if (width >= 768) {
          const before = await track.evaluate(el => el.scrollLeft);
          await page.locator('[data-scroller-next="reviews-track"]').click();
          assert.notEqual(await track.evaluate(el => el.scrollLeft), before);
        }
        assert.equal(await page.locator("[data-map] iframe, [data-map-load]").count(), 0, "the map is a local screenshot");
        await page.locator(".contacts-map__image").scrollIntoViewIfNeeded();
        await page.locator(".contacts-map__image").evaluate(img => img.decode());
        assert.equal(await page.locator(".contacts-map__image").evaluate(img => img.naturalWidth), 3000, "map screenshot must retain high resolution");
        assert.equal(await page.locator(".contacts-map__marker").count(), 1);
        assert.equal(await page.locator(".patient-card > .icon--arrow-up-right, .building-mark").count(), 0);
        assert.equal(await page.locator(".review-card .rating__count").count(), 0, "reviews have a score without a count");
        assert.equal(await page.locator(".doctor-card .rating__stars").count(), 8);
        assert.equal(await page.locator(".clinic-document:has(a)").count(), 2, "documents without files stay noninteractive");
        assert.doesNotMatch(await page.locator("main").innerText(), /демонстрацион|демо|файл предоставит|загрузится по нажатию|недостающие файлы|для макета/i);
        await page.reload();
        await page.locator('img[loading="lazy"]').evaluateAll(images => images.forEach(img => { img.loading = "eager"; }));
        await page.waitForFunction(() => [...document.images].every(img => img.complete));
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: path.join(shots, `home-${width}.png`), fullPage: true });
        await page.locator("#directions").screenshot({ path: path.join(shots, `directions-${width}.png`) });
        await page.locator(".home-callback").first().screenshot({ path: path.join(shots, `callback-${width}.png`) });
        await page.locator("#booking").screenshot({ path: path.join(shots, `form-${width}.png`) });
        await page.locator(".dcard--chek-ap").click({ position: { x: 20, y: 20 } });
        assert.ok(page.url().endsWith("/index.html"), "unrequested destinations remain inactive");
        await page.goto(base + "/index.html");
      } else {
        await page.screenshot({ path: path.join(shots, `${file.replace(".html", "")}-${width}.png`), fullPage: true });
      }
      const form = page.locator("#booking form");
      await form.locator('[name="name"]').fill("Тест");
      await form.locator('[name="phone"]').fill("9271234567");
      await form.locator('[name="consent"]').check();
      await form.locator('[name="email"]').fill("invalid-email");
      await form.locator('[type="submit"]').click();
      assert.equal(await form.locator('[name="email"]').getAttribute("aria-invalid"), "true");
      await form.locator('[name="email"]').fill("");
      await form.locator('[type="submit"]').click();
      assert.equal(await page.locator("#booking [data-form-success]").isVisible(), true, "email is optional for phone replies");
      await page.locator("#booking [data-form-again]").click();
      if (file === "prices.html") {
        await page.locator("[data-price-category]").selectOption("analizy");
        assert.equal(await page.locator(".price-item").count(), 4);
        await page.locator("[data-price-search]").fill("A09.05.076");
        assert.equal(await page.locator(".price-item").count(), 1);
        await page.locator("[data-price-search]").fill("несуществующая услуга");
        assert.equal(await page.locator("[data-price-empty]").isVisible(), true);
        await page.locator("[data-price-reset]").click();
        assert.equal(await page.locator(".price-item").count(), 14);
        await page.goto(base + "/prices.html?category=analizy");
        assert.equal(await page.locator(".price-item").count(), 4);
      }
      if (width === 360) {
        await page.locator("[data-menu-open]").click();
        assert.equal(await page.locator("#site-menu").evaluate(el => el.open), true);
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("#site-menu").evaluate(el => el.open), false);
      }
    }
    await context.close();
    console.log(`Passed: ${width}px, all four pages, forms, search, reviews, map and links.`);
  }
  assert.deepEqual(errors, []);
  console.log("Screenshots: " + shots);
} finally { await browser.close(); }
