import fs from "node:fs";
import path from "node:path";
import { expect } from "@playwright/test";

/** 與 sw-main.js 的 CACHE_VERSION 同步，避免 bump 版號後 CI 仍寫死 v3。 */
export function readPwaCacheVersion(): string {
  const sw = fs.readFileSync(path.join(process.cwd(), "sw-main.js"), "utf8");
  const match = sw.match(/CACHE_VERSION\s*=\s*"([^"]+)"/);
  expect(match, "sw-main.js 應定義 CACHE_VERSION").toBeTruthy();
  return match![1];
}

/** 測試用舊快取名（須與現行版不同，模擬升級前殘留）。 */
export function legacyPwaCacheVersion(current = readPwaCacheVersion()): string {
  return current === "jpwn-pwa-v2" ? "jpwn-pwa-v1" : "jpwn-pwa-v2";
}
