"use strict";

// Frozen static V1/V4 Neuron Explorer. Reads ./data exported by export_static.py.

const DATA = "data";
const TABS = [
  { id: "hypothesis", label: "🧠 Hypothesis" },
  { id: "natural", label: "📸 Natural Images" },
  { id: "generated", label: "🎨 Generated" },
  { id: "all", label: "🖼️ All Images" },
];

const state = {
  manifest: null,
  area: "V4",
  neuron: null,
  percentile: null,
  tab: "hypothesis",
  meta: null,
};

const el = (tag, props = {}, ...kids) => {
  const n = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  });
  kids.flat().forEach((c) => n.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
  return n;
};

async function fetchJSON(path) {
  const r = await fetch(path, { cache: "no-store" });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

function neuronsForArea() {
  return state.manifest.areas[state.area]?.neurons || [];
}

function metaDir() {
  return `${DATA}/${state.area}/n${state.neuron}_p${state.percentile}`;
}

// ---- Controls ----------------------------------------------------------------
function renderAreaToggle() {
  const box = document.getElementById("area-toggle");
  box.innerHTML = "";
  Object.keys(state.manifest.areas).forEach((area) => {
    box.appendChild(
      el("button", {
        class: area === state.area ? "active" : "",
        onclick: () => { state.area = area; onAreaChange(); },
      }, area)
    );
  });
}

function renderNeuronSelect() {
  const sel = document.getElementById("neuron-select");
  sel.innerHTML = "";
  neuronsForArea().forEach((n) => sel.appendChild(el("option", { value: n.id }, `Neuron ${n.id}`)));
  sel.value = state.neuron;
  sel.onchange = () => { state.neuron = parseInt(sel.value, 10); onNeuronChange(); };
}

function renderPercentileSelect() {
  const sel = document.getElementById("percentile-select");
  sel.innerHTML = "";
  const entry = neuronsForArea().find((n) => n.id === state.neuron);
  const pcts = entry ? entry.percentiles : [];
  pcts.forEach((p) =>
    sel.appendChild(el("option", { value: p }, p === 100 ? "100 (MEI / max)" : `${p} (LEI / min)`))
  );
  if (!pcts.includes(state.percentile)) state.percentile = pcts[0];
  sel.value = state.percentile;
  sel.onchange = () => { state.percentile = parseInt(sel.value, 10); loadAndRender(); };
}

function renderTabs() {
  const nav = document.getElementById("tabs");
  nav.innerHTML = "";
  TABS.forEach((t) =>
    nav.appendChild(
      el("button", {
        class: t.id === state.tab ? "active" : "",
        onclick: () => { state.tab = t.id; renderTabs(); renderContent(); },
      }, t.label)
    )
  );
}

// ---- Change handlers ---------------------------------------------------------
function onAreaChange() {
  renderAreaToggle();
  const neurons = neuronsForArea();
  state.neuron = neurons.length ? neurons[0].id : null;
  onNeuronChange();
}

function onNeuronChange() {
  renderNeuronSelect();
  const entry = neuronsForArea().find((n) => n.id === state.neuron);
  state.percentile = entry && entry.percentiles.includes(state.percentile)
    ? state.percentile
    : (entry ? entry.percentiles[0] : null);
  renderPercentileSelect();
  loadAndRender();
}

async function loadAndRender() {
  renderPercentileSelect();
  const content = document.getElementById("content");
  content.innerHTML = "";
  content.appendChild(el("p", { class: "muted" }, "Loading…"));
  try {
    state.meta = await fetchJSON(`${metaDir()}/meta.json`);
  } catch (e) {
    content.innerHTML = "";
    content.appendChild(el("p", { class: "muted" }, `Could not load data: ${e.message}`));
    return;
  }
  renderContent();
}

// ---- Renderers ---------------------------------------------------------------
function imageCard(item, captionFn, descFn, summaryLabel = "Description") {
  const card = el("div", { class: "card" });
  card.appendChild(el("img", { src: `${metaDir()}/${item.file}`, loading: "lazy" }));
  if (captionFn) card.appendChild(el("div", { class: "cap" }, captionFn(item)));
  if (descFn && descFn(item)) {
    const d = el("details");
    d.appendChild(el("summary", {}, summaryLabel));
    d.appendChild(el("p", {}, descFn(item)));
    card.appendChild(d);
  }
  return card;
}

function grid(items, captionFn, descFn, cols3 = false, summaryLabel = "Description") {
  if (!items || !items.length) return el("p", { class: "muted" }, "No images available.");
  const g = el("div", { class: cols3 ? "grid cols-3" : "grid" });
  items.forEach((it) => g.appendChild(imageCard(it, captionFn, descFn, summaryLabel)));
  return g;
}

function promptText(it) {
  let s = it.prompt || "";
  if (it.emphasis_tags && it.emphasis_tags.length) {
    s += (s ? "\n\n" : "") + "Tags: " + it.emphasis_tags.join(", ");
  }
  return s;
}

function renderHypothesis() {
  const c = el("div");
  const m = state.meta;
  c.appendChild(el("h2", { class: "section-title" },
    `${state.area} Neuron ${state.neuron} — Percentile ${state.percentile}`));
  if (m.hypothesis) {
    c.appendChild(el("div", { class: "hypothesis-box", html: mdToHtml(m.hypothesis) }));
  } else {
    c.appendChild(el("p", { class: "muted" }, "No hypothesis available for this neuron."));
  }
  const conf = m.confidence;
  if (conf) {
    const stats = el("div", { class: "stats" });
    if (conf.primary_feature_confidence != null)
      stats.appendChild(stat("Primary feature confidence", `${conf.primary_feature_confidence}%`));
    if (conf.spatial_consistency != null)
      stats.appendChild(stat("Spatial consistency", `${conf.spatial_consistency}%`));
    if (conf.evidence_quality)
      stats.appendChild(stat("Evidence quality", conf.evidence_quality));
    c.appendChild(stats);
  }
  return c;
}

function renderNatural() {
  const c = el("div");
  c.appendChild(el("h2", { class: "section-title" }, "Top 15 Natural ImageNet Images"));
  c.appendChild(grid(
    state.meta.natural,
    (it) => `Act: ${it.activation.toFixed(3)}`,
    (it) => it.description
  ));
  return c;
}

function renderGenerated() {
  const c = el("div");
  c.appendChild(el("h2", { class: "section-title" }, "Generated Images (diffusion prompts)"));
  c.appendChild(grid(state.meta.generated, (it) => `Prompt ${it.prompt_id}`, promptText, false, "Prompt"));
  return c;
}

function renderAll() {
  const c = el("div");
  c.appendChild(el("h2", { class: "section-title" },
    `Image Comparison — Neuron ${state.neuron} (p${state.percentile})`));
  const cols = el("div", { class: "columns3" });

  const col = (title, node) => {
    const d = el("div");
    d.appendChild(el("h3", {}, title));
    d.appendChild(node);
    return d;
  };
  cols.appendChild(col("Top 15 Natural",
    grid(state.meta.natural, (it) => `Act: ${it.activation.toFixed(3)}`, null, true)));
  cols.appendChild(col("Top 15 Generated",
    grid(state.meta.generated, (it) => `Prompt ${it.prompt_id}`, promptText, true, "Prompt")));
  cols.appendChild(col("Top 15 Augmented",
    grid(state.meta.augmented,
      (it) => `Act ${it.best_activation.toFixed(3)} | ${it.best_percentile.toFixed(1)}%ile`, null, true)));
  c.appendChild(cols);
  return c;
}

function stat(label, value) {
  return el("div", { class: "stat" },
    el("div", { class: "label" }, label),
    el("div", { class: "value" }, String(value)));
}

function mdToHtml(s) {
  // minimal: **bold** and newlines
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function renderContent() {
  const content = document.getElementById("content");
  content.innerHTML = "";
  if (!state.meta) return;
  switch (state.tab) {
    case "hypothesis": content.appendChild(renderHypothesis()); break;
    case "natural": content.appendChild(renderNatural()); break;
    case "generated": content.appendChild(renderGenerated()); break;
    case "all": content.appendChild(renderAll()); break;
  }
}

// ---- Boot --------------------------------------------------------------------
async function boot() {
  try {
    state.manifest = await fetchJSON(`${DATA}/manifest.json`);
  } catch (e) {
    document.getElementById("content").appendChild(
      el("p", { class: "muted" }, `Could not load manifest.json: ${e.message}`));
    return;
  }
  const areas = Object.keys(state.manifest.areas);
  state.area = areas.includes("V4") ? "V4" : areas[0];
  renderAreaToggle();
  renderTabs();
  const neurons = neuronsForArea();
  state.neuron = neurons.length ? neurons[0].id : null;
  const entry = neurons[0];
  state.percentile = entry ? entry.percentiles[0] : null;
  renderNeuronSelect();
  loadAndRender();
}

boot();
