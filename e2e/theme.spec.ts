import { expect, test } from "@playwright/test";
import { loadImageViaInput, makeImage } from "./helpers";

test("paper theme matches CJP palette", async ({ page }) => {
  await page.goto("http://localhost:4173/");
  const styles = await page.evaluate(() => {
    const s = (sel: string, prop: string) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el)[prop] : null;
    };
    return {
      bodyBg: getComputedStyle(document.body).backgroundColor,
      h1Font: s(".app-header h1", "fontFamily"),
      dropzoneBtnBg: s(".dropzone-btn", "backgroundColor"),
      footerBg: s(".app-footer", "backgroundColor"),
    };
  });
  expect(styles.bodyBg).toBe("rgb(244, 235, 215)"); // Paper
  expect(styles.h1Font).toContain("Bowlby One");
  expect(styles.dropzoneBtnBg).toBe("rgb(201, 162, 39)"); // Gold
  expect(styles.footerBg).toBe("rgb(26, 17, 8)"); // Ink strip

  const img = await makeImage(page, 800, 600);
  await loadImageViaInput(page, img);
  await page.waitForSelector("#origBox img");

  const crop = await page.evaluate(() => {
    const vp = document.querySelector(".crop-viewport")!;
    const cs = getComputedStyle(vp);
    return { borderStyle: cs.borderTopStyle, borderColor: cs.borderTopColor };
  });
  expect(crop.borderStyle).toBe("dashed"); // seal-ring motif
  expect(crop.borderColor).toBe("rgb(201, 162, 39)");
});

test("dark theme inverts to ink + paper", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("http://localhost:4173/");
  const styles = await page.evaluate(() => {
    const s = (sel: string, prop: string) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el)[prop] : null;
    };
    return {
      bodyBg: getComputedStyle(document.body).backgroundColor,
      cardBg: s(".panel", "backgroundColor"),
      h1Color: s(".app-header h1", "color"),
    };
  });
  expect(styles.bodyBg).toBe("rgb(26, 17, 8)"); // Ink
  expect(styles.cardBg).toBe("rgb(36, 26, 13)");
  expect(styles.h1Color).toBe("rgb(244, 235, 215)"); // Paper
});