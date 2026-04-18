/**
 * Point this at your Next.js app. For production, add your deployed origin to
 * manifest.json `host_permissions` and set API_ANALYZE_URL here.
 */
const API_ANALYZE_URL = "http://localhost:3000/api/analyze";

function extractParagraphText() {
  const paragraphs = Array.from(document.querySelectorAll("p"))
    .map((p) => (p.innerText || "").trim())
    .filter(Boolean);
  const joined = paragraphs.join("\n\n");
  if (joined.length > 0) {
    return joined.slice(0, 100000);
  }
  const fallback = (document.body && document.body.innerText) || "";
  return fallback.trim().slice(0, 100000);
}

function setStatus(el, message, isError = false) {
  el.textContent = message;
  el.classList.toggle("err", isError);
}

function renderResults(container, data) {
  container.classList.remove("empty");
  const score = data.bias_score ?? "—";
  const category = data.bias_category ?? "—";
  const summary = data.analysis_summary ?? "—";
  const note =
    data.insufficient_content === true
      ? "\n\nNote: insufficient content for a full score."
      : "";
  container.textContent = [
    "BIAS SCORE",
    String(score),
    "",
    "BIAS CATEGORY",
    String(category),
    "",
    "ANALYSIS SUMMARY",
    String(summary) + note,
  ].join("\n");
}

document.getElementById("scan").addEventListener("click", async () => {
  const statusEl = document.getElementById("status");
  const resultsEl = document.getElementById("results");
  const btn = document.getElementById("scan");

  resultsEl.classList.add("empty");
  resultsEl.textContent = "";
  btn.disabled = true;
  setStatus(statusEl, "Reading page…");

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (!tab?.id) {
      setStatus(statusEl, "No active tab found.", true);
      return;
    }

    const [{ result: text }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractParagraphText,
    });

    const articleText = typeof text === "string" ? text.trim() : "";
    if (!articleText) {
      setStatus(statusEl, "No paragraph text found on this page.", true);
      return;
    }

    setStatus(statusEl, "Analyzing…");

    const res = await fetch(API_ANALYZE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: articleText }),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        typeof payload.error === "string"
          ? payload.error
          : `Request failed (${res.status})`;
      setStatus(statusEl, msg, true);
      return;
    }

    setStatus(statusEl, "Done.");
    renderResults(resultsEl, payload);
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Something went wrong. Try again.";
    setStatus(statusEl, msg, true);
  } finally {
    btn.disabled = false;
  }
});
