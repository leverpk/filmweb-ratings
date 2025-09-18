import { chromium } from "playwright";
import fs from "fs";

// Podmieñ na swoje filmy:
const FILMS = [
  { title: "Skazani na Shawshank", url: "https://www.filmweb.pl/film/Skazani+na+Shawshank-1994-1048" },
  { title: "Incepcja", url: "https://www.filmweb.pl/film/Incepcja-2010-500891" }
];

async function getRating(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const sels = [
    "[data-testid=\"film-rating\"]",
    ".filmRating__rate",
    "meta[itemprop=\"ratingValue\"]"
  ];

  let ratingText = null;
  for (const sel of sels) {
    try {
      if (sel.startsWith("meta")) {
        const val = await page.$eval(sel, el => el.getAttribute("content"));
        if (val) { ratingText = String(val); break; }
      } else {
        await page.waitForSelector(sel, { timeout: 5000 });
        const val = await page.$eval(sel, el => el.textContent.trim());
        if (val) { ratingText = val; break; }
      }
    } catch {}
  }

  let votes = null;
  try {
    const votesSel = "[data-testid=\"film-votes\"], .filmRating__count";
    const raw = await page.$eval(votesSel, el => el.textContent.trim());
    votes = raw.replace(/[^0-9]/g, "");
  } catch {}

  return { rating: ratingText, votes };
}

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();

  const out = [];
  for (const f of FILMS) {
    try {
      const { rating, votes } = await getRating(page, f.url);
      out.push({ title: f.title, url: f.url, rating, votes, ts: Date.now() });
    } catch (e) {
      out.push({ title: f.title, url: f.url, rating: null, votes: null, ts: Date.now(), error: String(e) });
    }
  }

  await browser.close();

  fs.mkdirSync("public", { recursive: true });
  fs.writeFileSync("public/ratings.json", JSON.stringify(out, null, 2), "utf-8");
})();
