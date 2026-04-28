/**
 * Configure your deployed Next.js origin for production:
 * - Add it to manifest.json under `host_permissions`
 * - Set ANALYZER_PAGE_URL (full analyzer URL)
 */
const ANALYZER_PAGE_URL = "http://localhost:3000/";

/** Runs in the page — must return JSON-serializable data only. */
function scanNewsPage() {
  const host = (location.hostname || "").replace(/^www\./i, "");
  const path = (location.pathname || "").toLowerCase();

  /* ── 1. Meta signals ─────────────────────────────────────────────── */
  let ogType = "";
  const ogMeta = document.querySelector('meta[property="og:type"]');
  if (ogMeta) ogType = (ogMeta.getAttribute("content") || "").toLowerCase();

  let schemaArticle = false;
  function considerType(obj) {
    const ty = obj["@type"];
    const types = Array.isArray(ty) ? ty : ty ? [ty] : [];
    for (const t of types) {
      if (typeof t !== "string") continue;
      if (/NewsArticle|BlogPosting|^Article$/i.test(t)) {
        schemaArticle = true;
        return;
      }
    }
  }
  function walkJsonLd(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walkJsonLd); return; }
    considerType(node);
    if (node["@graph"]) walkJsonLd(node["@graph"]);
    Object.values(node).forEach((v) => { if (v && typeof v === "object") walkJsonLd(v); });
  }
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try { walkJsonLd(JSON.parse(script.textContent || "{}")); } catch { /* ignore */ }
  }

  /* ── 2. Find the best content root ──────────────────────────────── */
  // Clone the document so we can safely strip noise without affecting the page.
  const docClone = document.cloneNode(true);

  // Remove elements that are never article body.
  const NOISE_SELECTORS = [
    "script", "style", "noscript", "iframe", "svg",
    "header", "footer", "nav", "aside",
    "[role='navigation']", "[role='banner']", "[role='contentinfo']", "[role='complementary']",
    ".ad", ".ads", ".advertisement", ".promo", ".sidebar", ".related", ".recommended",
    ".comments", ".comment-section", "#comments",
    ".social", ".share", ".newsletter", ".subscribe",
    "[class*='ad-']", "[class*='-ad']", "[id*='ad-']",
    "[class*='widget']", "[class*='sidebar']",
  ].join(",");
  docClone.querySelectorAll(NOISE_SELECTORS).forEach((el) => el.remove());

  // Ordered list of selectors to try as the article root (most specific first).
  const ROOT_CANDIDATES = [
    // Semantic / schema
    "[itemprop='articleBody']",
    "[itemprop='description']",
    // Data-attribute markers (e.g. TOI uses data-articlebody="1")
    "[data-articlebody='1']",
    "[data-article-body]",
    "[data-content-type='article']",
    // Common article wrappers
    "article",
    "[role='article']",
    // ID-based
    "#article-body", "#articleBody", "#article_body",
    "#story-body", "#storyBody",
    "#main-content", "#mainContent",
    "#content-body", "#contentBody",
    // Class-based (broad patterns)
    "[class*='article-body']",
    "[class*='ArticleBody']",
    "[class*='article__body']",
    "[class*='story-body']",
    "[class*='StoryBody']",
    "[class*='post-body']",
    "[class*='PostBody']",
    "[class*='entry-content']",
    "[class*='article-content']",
    "[class*='ArticleContent']",
    "[class*='story-content']",
    "[class*='post-content']",
    "[class*='news-body']",
    "[class*='body-content']",
    "[class*='content-body']",
    "[class*='article-text']",
    "[class*='articleText']",
    "[class*='story-text']",
    "[class*='main-content']",
    // Fallback to <main>
    "main",
    "[role='main']",
  ];

  function wordLen(el) {
    return (el.innerText || el.textContent || "").trim().split(/\s+/).filter(Boolean).length;
  }

  let contentRoot = null;
  for (const sel of ROOT_CANDIDATES) {
    const el = docClone.querySelector(sel);
    if (el && wordLen(el) >= 60) { contentRoot = el; break; }
  }
  if (!contentRoot) contentRoot = docClone.body || docClone;

  /* ── 3. Extract text ─────────────────────────────────────────────── */

  /**
   * Walk all TEXT_NODEs inside `root`, accumulate consecutive text into
   * chunks split on block-level boundaries (br, div, p, h*, li, etc.).
   * This handles sites like TOI where article prose lives as raw text
   * nodes between inline elements rather than in <p> tags.
   */
  function extractTextNodes(root) {
    const BLOCK_TAGS = new Set([
      "P", "DIV", "SECTION", "ARTICLE", "BLOCKQUOTE",
      "H1", "H2", "H3", "H4", "H5", "H6",
      "LI", "TD", "TH", "BR", "HR",
    ]);
    const chunks = [];
    let current = "";

    function flush() {
      const t = current.trim();
      if (t.length > 40) chunks.push(t);
      current = "";
    }

    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        current += node.nodeValue;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName;
        // Skip noise elements entirely
        if (/^(SCRIPT|STYLE|NOSCRIPT|IFRAME|BUTTON|INPUT|SELECT|TEXTAREA|SVG)$/i.test(tag)) return;
        if (BLOCK_TAGS.has(tag)) {
          flush();
          node.childNodes.forEach(walk);
          flush();
        } else {
          node.childNodes.forEach(walk);
        }
      }
    }

    walk(root);
    flush();
    return chunks;
  }

  // Primary: <p> tags inside the found root.
  let paragraphs = Array.from(contentRoot.querySelectorAll("p"))
    .map((p) => (p.innerText || p.textContent || "").trim())
    .filter((t) => t.length > 30); // skip trivially short fragments

  // Secondary: if <p> tags yield less than 150 words, mine leaf block divs.
  const primaryWords = paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
  if (primaryWords < 150) {
    const blockTexts = Array.from(
      contentRoot.querySelectorAll("div, section, span")
    )
      .filter((el) => {
        // Only leaf-like elements (no child block elements).
        const hasBlockChild = el.querySelector("div, section, article, p, ul, ol, h1, h2, h3");
        return !hasBlockChild;
      })
      .map((el) => (el.innerText || el.textContent || "").trim())
      .filter((t) => t.length > 40);

    if (blockTexts.length > 0) {
      // Merge both sources, deduplicate adjacent duplicates.
      const combined = [...paragraphs, ...blockTexts];
      const deduped = [];
      const seen = new Set();
      for (const t of combined) {
        const key = t.slice(0, 60);
        if (!seen.has(key)) { seen.add(key); deduped.push(t); }
      }
      paragraphs = deduped;
    }
  }

  // Tertiary: text-node walker — catches TOI/NDTV style inline prose
  // (text lives as raw text nodes between inline elements, not in <p>)
  if (paragraphs.join(" ").split(/\s+/).filter(Boolean).length < 100) {
    const nodeChunks = extractTextNodes(contentRoot);
    if (nodeChunks.length > 0) {
      const combined = [...paragraphs, ...nodeChunks];
      const deduped = [];
      const seen = new Set();
      for (const t of combined) {
        const key = t.slice(0, 60);
        if (!seen.has(key)) { seen.add(key); deduped.push(t); }
      }
      paragraphs = deduped;
    }
  }

  // Last-resort: full page <p> scan if we still have very little.
  if (paragraphs.join(" ").split(/\s+/).filter(Boolean).length < 60) {
    const fullPageP = Array.from(document.querySelectorAll("p"))
      .map((p) => (p.innerText || p.textContent || "").trim())
      .filter((t) => t.length > 30);
    const fullPageNodes = extractTextNodes(document.body);
    const combined = [...fullPageP, ...fullPageNodes];
    const deduped = [];
    const seen = new Set();
    for (const t of combined) {
      const key = t.slice(0, 60);
      if (!seen.has(key)) { seen.add(key); deduped.push(t); }
    }
    paragraphs = deduped;
  }

  const text = paragraphs.join("\n\n").slice(0, 120000);
  const wordCount = text.trim().length
    ? text.trim().split(/\s+/).filter(Boolean).length
    : 0;

  /* ── 4. Scoring ──────────────────────────────────────────────────── */
  const urlLooksNewsy =
    /\/(news|article|story|opinion|politics|world|business|breaking|sports|tech|science|health|entertainment)\b/i.test(path) ||
    /\/20\d{2}\/\d{2}\//.test(path) ||
    /\/\d{4}-\d{2}-\d{2}[-/]/.test(path);

  const newsHostHints =
    /news|times|post|herald|tribune|daily|bbc\.|cnn\.|reuters|guardian|ndtv|indianexpress|thehindu|economictimes|livemint|scroll\.|wire|firstpost|thewire|hindustantimes|mint\.|theprint|outlook|wion|moneycontrol/i.test(host);

  const articleEl = document.querySelector("article");
  const hasArticleBody =
    !!articleEl &&
    (articleEl.innerText || "").trim().split(/\s+/).filter(Boolean).length > 80;

  let score = 0;
  const signals = [];

  if (ogType === "article") { score += 3; signals.push("Open Graph marks this page as an article"); }
  if (schemaArticle) { score += 4; signals.push("Structured data includes Article / NewsArticle"); }
  if (hasArticleBody) { score += 2; signals.push("Semantic <article> block with readable text"); }
  if (urlLooksNewsy) { score += 2; signals.push("URL path resembles a news story"); }
  if (newsHostHints) { score += 1; signals.push("Domain looks like a news outlet"); }
  if (wordCount >= 300) { score += 1; signals.push("Substantial text extracted (" + wordCount + " words)"); }

  /* ── 5. Verdict ──────────────────────────────────────────────────── */
  // Lower threshold: we'd rather show something useful than refuse.
  let verdict = "unlikely_news";
  if (wordCount < 40) {
    verdict = "insufficient_text";
  } else if (
    score >= 4 ||
    (score >= 2 && wordCount >= 150) ||
    (ogType === "article" && wordCount >= 80) ||
    (wordCount >= 400)
  ) {
    verdict = "likely_news";
  }

  return {
    wordCount,
    signals,
    verdict,
    score,
    articleText: text,
    url: location.href,
    title: document.title || "",
    ogType,
    schemaArticle,
  };
}

let pendingArticleText = "";

function showPanel(id) {
  document.querySelectorAll(".panel").forEach((p) => {
    p.hidden = p.id !== id;
  });
}

function verdictCopy(verdict) {
  switch (verdict) {
    case "likely_news":
      return {
        title: "This looks like a news article",
        titleClass: "ok",
        body: "Signals on this page suggest article-style content. Review the excerpt and copy the payload when ready.",
      };
    case "unlikely_news":
      return {
        title: "This may not be a news article",
        titleClass: "warn",
        body: "We did not find strong signals (schema, article markup, or story-like URL). You can still run analysis if you believe there is readable article text below.",
      };
    case "insufficient_text":
      return {
        title: "Not enough article text",
        titleClass: "bad",
        body: "Open the article itself (not a homepage or section listing), then try again—or use Open analyzer to paste text.",
      };
    default:
      return {
        title: "Could not classify",
        titleClass: "warn",
        body: "",
      };
  }
}

function renderAssess(scan) {
  const card = document.getElementById("assess-card");
  const copy = verdictCopy(scan.verdict);
  const signalsHtml =
    scan.signals.length > 0
      ? `<ul class="signals">${scan.signals.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
      : '<p class="meta">No strong signals detected.</p>';

  card.innerHTML = `
    <div class="verdict-title ${copy.titleClass}">${escapeHtml(copy.title)}</div>
    <div>${escapeHtml(copy.body)}</div>
    ${signalsHtml}
    <p class="meta"><strong>${scan.wordCount.toLocaleString()}</strong> words extracted · ${escapeHtml(scan.title || "Untitled")}</p>
    <p class="mono">${escapeHtml(truncate(scan.url, 120))}</p>
  `;

  const submitBtn = document.getElementById("btn-submit-analysis");
  const assessStatus = document.getElementById("assess-status");

  assessStatus.textContent = "";
  assessStatus.classList.remove("err");

  if (scan.verdict === "insufficient_text") {
    pendingArticleText = "";
    submitBtn.disabled = true;
    assessStatus.textContent =
      "Copy is disabled until there is enough text to analyze.";
  } else {
    pendingArticleText = scan.articleText || "";
    submitBtn.disabled = !pendingArticleText.trim();
    submitBtn.textContent = "Copy for analysis";
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(s, n) {
  const t = String(s);
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return tab ?? null;
}

function isRestrictedUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    const p = u.protocol.replace(":", "");
    return /^(chrome|chrome-extension|edge|about|devtools|moz-extension)$/i.test(
      p,
    );
  } catch {
    return false;
  }
}

document.getElementById("btn-open-analyzer").addEventListener("click", () => {
  chrome.tabs.create({ url: ANALYZER_PAGE_URL });
  window.close();
});

document.getElementById("btn-predict").addEventListener("click", async () => {
  const globalStatus = document.getElementById("global-status");
  globalStatus.textContent = "";

  showPanel("panel-loading");
  const loadingMsg = document.getElementById("loading-message");
  const statusEl = document.getElementById("status");
  loadingMsg.textContent = "Scanning this page…";
  statusEl.textContent = "";

  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      showPanel("panel-home");
      globalStatus.textContent = "No active tab.";
      return;
    }

    if (isRestrictedUrl(tab.url)) {
      showPanel("panel-home");
      globalStatus.textContent =
        "Open a normal web page (news article). Built-in browser pages cannot be scanned.";
      return;
    }

    const [{ result: scan }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scanNewsPage,
    });

    if (!scan || typeof scan !== "object") {
      globalStatus.textContent = "Could not read this page.";
      showPanel("panel-home");
      return;
    }

    renderAssess(scan);
    showPanel("panel-assess");
  } catch (e) {
    let msg = e instanceof Error ? e.message : "Could not access this tab.";
    if (/chrome(-extension)?:\/\//i.test(msg) || /Cannot access/i.test(msg)) {
      msg =
        "This page cannot be scanned (browser UI or restricted URL). Open an article on a normal website.";
    }
    globalStatus.textContent = msg;
    showPanel("panel-home");
  }
});

document.getElementById("btn-assess-back").addEventListener("click", () => {
  pendingArticleText = "";
  showPanel("panel-home");
});

/** Same string that would be sent as the POST body to the analyze API. */
function analysisRequestBody(text) {
  return JSON.stringify({ text });
}

async function copyAnalysisPayloadToClipboard(text) {
  const assessStatus = document.getElementById("assess-status");
  const body = analysisRequestBody(text);

  try {
    await navigator.clipboard.writeText(body);
    assessStatus.textContent =
      "Copied JSON body to clipboard (ready to paste into your API client).";
    assessStatus.classList.remove("err");
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Could not write to the clipboard.";
    assessStatus.textContent = msg;
    assessStatus.classList.add("err");
  }
}

document
  .getElementById("btn-submit-analysis")
  .addEventListener("click", async () => {
    const text = pendingArticleText.trim();
    if (!text) return;
    document.getElementById("assess-status").textContent = "";
    document.getElementById("assess-status").classList.remove("err");
    await copyAnalysisPayloadToClipboard(text);
  });

showPanel("panel-home");
