import { expect, test } from "@playwright/test";

test("更新 Service Worker 後採用新樣式，並保留筆記資料", async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/sw-main.js", async (route) => {
    await gate;
    await route.continue();
  });
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.route("https://gist.githubusercontent.com/**", (route) => route.abort());
  const response = await page.goto("/cover.html");
  expect(response?.ok()).toBeTruthy();
  expect(new URL(page.url()).hostname).toBe("127.0.0.1");

  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("jpwn-ink", 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("pages")) {
          request.result.createObjectStore("pages");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("pages", "readwrite");
      tx.objectStore("pages").put({ marker: "keep-note" }, "a11y-keep");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    const cache = await caches.open("jpwn-pwa-v2");
    await cache.put(new Request("/css/style.css"), new Response("OLD-CSS", {
      headers: { "Content-Type": "text/css" },
    }));
  });

  release();
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await expect.poll(async () => page.evaluate(() => !!navigator.serviceWorker.controller)).toBeTruthy();

  await expect.poll(async () => page.evaluate(async () => (await caches.keys()).includes("jpwn-pwa-v2"))).toBeFalsy();
  await expect.poll(async () => page.evaluate(async () => (await caches.keys()).includes("jpwn-pwa-v3"))).toBeTruthy();

  const css = await page.evaluate(async () => (await fetch("/css/style.css")).text());
  expect(css).toContain("prefers-reduced-motion");
  expect(css).not.toContain("OLD-CSS");

  const kept = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("jpwn-ink", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const marker = await new Promise<string>((resolve, reject) => {
      const tx = db.transaction("pages", "readonly");
      const request = tx.objectStore("pages").get("a11y-keep");
      request.onsuccess = () => resolve(request.result?.marker || "");
      request.onerror = () => reject(request.error);
    });
    db.close();
    return marker;
  });
  expect(kept).toBe("keep-note");
});
