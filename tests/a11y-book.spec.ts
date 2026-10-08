import { expect, test } from "@playwright/test";

test("整本講義含答案時讀得到答案，未揭曉仍稱為挖空", async ({ page }) => {
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.route("https://gist.githubusercontent.com/**", (route) => route.abort());
  const response = await page.goto("/book.html");
  expect(response?.ok()).toBeTruthy();
  expect(new URL(page.url()).hostname).toBe("127.0.0.1");

  const result = await page.evaluate(async () => {
    window.open = (url?: string | URL) => {
      (window as unknown as { __bookUrl: string }).__bookUrl = String(url || "");
      return { addEventListener() {} } as unknown as Window;
    };
    function section() {
      const node = document.createElement("section");
      node.className = "book-section";
      node.dataset.kind = "section";
      node.dataset.bookPage = "1";
      const blank = document.createElement("span");
      blank.className = "blank";
      blank.dataset.answer = "光源|發光體";
      blank.setAttribute("aria-label", "挖空");
      blank.textContent = "\u00a0";
      node.append(blank);
      return node;
    }
    async function render(withAnswers: boolean) {
      window.JPWNBookPdf.download({
        sections: [section()],
        filename: "book.html",
        withAnswers,
      });
      const html = await (await fetch((window as unknown as { __bookUrl: string }).__bookUrl)).text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const blank = doc.querySelector(".blank");
      return {
        label: blank?.getAttribute("aria-label"),
        text: (blank?.textContent || "").trim(),
        revealed: blank?.classList.contains("revealed") || false,
      };
    }
    return { shown: await render(true), hidden: await render(false) };
  });

  expect(result.shown.revealed).toBeTruthy();
  expect(result.shown.text).toBe("光源");
  expect(result.shown.label).toBeNull();
  expect(result.hidden.revealed).toBeFalsy();
  expect(result.hidden.label).toBe("挖空");
  expect(result.hidden.text).toBe("");
});
