// ═══════════════════════════════════════════════════════════════════════════════
//  MTA Subway Art — D3 + Scrollama
// ═══════════════════════════════════════════════════════════════════════════════

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const DATA_PATH = "data/artworks.csv";

// Category config — icon character, color, display label
// TODO: Replace icon characters with proper SVG symbol paths later
const CATEGORY_CONFIG = {
  "abstract":  { icon: "◈", color: "#4a4a4a", label: "Abstract"  },
  "humans":    { icon: "◎", color: "#3A7CA5", label: "Humans"    },
  "cityscape": { icon: "⬛", color: "#7B5EA7", label: "Cityscape" },
  "florals":   { icon: "✿", color: "#E8697D", label: "Florals"   },
  "animals":   { icon: "◉", color: "#4CAF50", label: "Animals"   },
  "landscape": { icon: "◭", color: "#2E8B57", label: "Landscape" },
  "culture":   { icon: "◈", color: "#C0392B", label: "Culture"   },
  "objects":   { icon: "⬡", color: "#E67E22", label: "Objects"   },
  "words":     { icon: "❝", color: "#1F9D8A", label: "Words"     },
};

// Order along the x-axis (left → right)
// TODO: Adjust to match exact category strings in your CSV
const CATEGORY_ORDER = [
  "abstract",  "humans",   "cityscape",
  "florals",   "animals",  "landscape",
  "culture",   "objects",  "words",
];

// Two categories shown in the hero section
const HERO_CATEGORIES = ["abstract", "florals"];

// Dot size (font-size for icon characters)
const DOT_SIZE = 8;   // px
const DOT_GAP  = 2;   // px between dots
const DOT_STEP = DOT_SIZE + DOT_GAP;

// ─── STATE ───────────────────────────────────────────────────────────────────

let allData    = [];
let byCategory = {};
let currentStep = -1;

// ─── SVG ELEMENTS ────────────────────────────────────────────────────────────

const mainSvg   = d3.select("#chart");
const heroSvg   = d3.select("#hero-chart");
const tooltip   = d3.select("#tooltip");

let W = 0, H = 0;        // main chart dimensions
let HW = 0, HH = 0;      // hero chart dimensions

function measureMain() {
  const el = document.getElementById("chart");
  W = el.clientWidth;
  H = el.clientHeight;
  mainSvg.attr("viewBox", `0 0 ${W} ${H}`);
}

function measureHero() {
  const el = document.getElementById("hero-chart");
  HW = el.clientWidth;
  HH = el.clientHeight;
  heroSvg.attr("viewBox", `0 0 ${HW} ${HH}`);
}

// ─── LOAD DATA ───────────────────────────────────────────────────────────────

Papa.parse(DATA_PATH, {
  download:       true,
  header:         true,
  skipEmptyLines: true,
  complete: ({ data }) => {
    allData = data;
    allData.forEach(d => {
      d.category = (d.category || "").toLowerCase().trim();
    });
    byCategory = d3.group(allData, d => d.category);

    measureHero();
    measureMain();

    drawHero();
    drawCoordinateChart();
    initScrollama();
  },
  error: err => console.error("CSV load error:", err),
});

window.addEventListener("resize", () => {
  measureHero();
  measureMain();
  drawHero();
  drawCoordinateChart();
  applyStep(currentStep);
});

// ─── GRID PAPER PATTERN (SVG defs) ───────────────────────────────────────────
// Adds a reusable grid pattern to an SVG's <defs>.
// Call once per SVG, then fill a rect with url(#grid-NNN).

function addGridPattern(svgEl, id) {
  // Remove any existing defs to avoid duplicates on redraw
  svgEl.select("defs").remove();

  const defs = svgEl.append("defs");

  // Minor grid: every 20px
  defs.append("pattern")
    .attr("id", `minor-${id}`)
    .attr("width", 20).attr("height", 20)
    .attr("patternUnits", "userSpaceOnUse")
    .append("path")
      .attr("d", "M 20 0 L 0 0 0 20")
      .attr("fill", "none")
      .attr("stroke", "rgba(150,180,210,0.25)")
      .attr("stroke-width", 0.5);

  // Major grid: every 100px, references minor
  const major = defs.append("pattern")
    .attr("id", `grid-${id}`)
    .attr("width", 100).attr("height", 100)
    .attr("patternUnits", "userSpaceOnUse");

  major.append("rect")
    .attr("width", 100).attr("height", 100)
    .attr("fill", `url(#minor-${id})`);

  major.append("path")
    .attr("d", "M 100 0 L 0 0 0 100")
    .attr("fill", "none")
    .attr("stroke", "rgba(150,180,210,0.55)")
    .attr("stroke-width", 1);

  return `url(#grid-${id})`;
}

// ─── HERO CHART ──────────────────────────────────────────────────────────────
// Shows two dot-matrix previews before the headline.

function drawHero() {
  heroSvg.selectAll("*").remove();

  const gridFill = addGridPattern(heroSvg, "hero");

  // Background rect with grid
  heroSvg.append("rect")
    .attr("width", HW).attr("height", HH)
    .attr("fill", gridFill);

  const padX  = 60;
  const padY  = 40;
  const halfW = (HW - padX * 2) / 2;

  HERO_CATEGORIES.forEach((cat, i) => {
    const items = byCategory.get(cat) || [];
    const cfg   = CATEGORY_CONFIG[cat] || { icon: "●", color: "#999", label: cat };

    const cx = padX + i * halfW + halfW / 2;
    const cy = HH / 2 - 20;

    // How many dots fit per row in this half
    const dotsPerRow = Math.max(4, Math.floor(halfW * 0.65 / DOT_STEP));
    const totalRows  = Math.ceil(items.length / dotsPerRow);
    const matrixH    = totalRows * DOT_STEP;

    const g = heroSvg.append("g")
      .attr("class", `hero-cat hero-cat-${cat}`)
      .attr("transform", `translate(${cx}, ${cy})`);

    items.forEach((d, j) => {
      const col = j % dotsPerRow;
      const row = Math.floor(j / dotsPerRow);
      const dx  = (col - dotsPerRow / 2 + 0.5) * DOT_STEP;
      const dy  = (row - totalRows  / 2 + 0.5) * DOT_STEP;

      g.append("text")
        .attr("x", dx).attr("y", dy)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", `${DOT_SIZE + 2}px`)
        .attr("fill", cfg.color)
        .attr("opacity", 0.9)
        .text(cfg.icon);
    });

    // Label
    g.append("text")
      .attr("y", matrixH / 2 + 18)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-family", "Georgia, serif")
      .attr("fill", "#333")
      .attr("letter-spacing", "0.08em")
      .text(cfg.label.toUpperCase());

    g.append("text")
      .attr("y", matrixH / 2 + 32)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-family", "Georgia, serif")
      .attr("fill", "#888")
      .text(`${items.length} works`);
  });

  // Vertical divider between the two charts
  heroSvg.append("line")
    .attr("x1", HW / 2).attr("y1", padY)
    .attr("x2", HW / 2).attr("y2", HH - padY)
    .attr("stroke", "rgba(150,180,210,0.5)")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "4,4");
}

// ─── MAIN COORDINATE CHART ───────────────────────────────────────────────────
// All 9 categories as columns above an x-axis, with y-axis on the left.

function drawCoordinateChart() {
  mainSvg.selectAll("*").remove();

  const gridFill = addGridPattern(mainSvg, "main");

  // Background
  mainSvg.append("rect")
    .attr("width", W).attr("height", H)
    .attr("fill", gridFill);

  const margin = { top: 30, right: 16, bottom: 72, left: 44 };
  const plotW  = W - margin.left - margin.right;
  const plotH  = H - margin.top  - margin.bottom;

  const g = mainSvg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const nCats     = CATEGORY_ORDER.length;
  const colWidth  = plotW / nCats;

  // How many dots fit across one category column (leave padding on each side)
  const dotsPerRow = Math.max(3, Math.floor(colWidth * 0.72 / DOT_STEP));

  // Tallest column
  const maxItems = d3.max(CATEGORY_ORDER, cat => (byCategory.get(cat) || []).length);
  const maxRows  = Math.ceil(maxItems / dotsPerRow);

  // Y scale: maps row count → pixel from top of plot area
  const yScale = d3.scaleLinear()
    .domain([0, maxRows])
    .range([plotH, 0]);

  // ── Horizontal grid lines (light, behind everything) ──
  const yTicks = d3.range(0, maxRows + 1, Math.ceil(maxRows / 5));
  yTicks.forEach(rowCount => {
    const y = yScale(rowCount);
    g.append("line")
      .attr("x1", 0).attr("y1", y)
      .attr("x2", plotW).attr("y2", y)
      .attr("stroke", "rgba(150,180,210,0.3)")
      .attr("stroke-width", 0.75)
      .attr("stroke-dasharray", "3,3");
  });

  // ── Y axis ──
  g.append("line")
    .attr("class", "axis-line")
    .attr("x1", 0).attr("y1", 0)
    .attr("x2", 0).attr("y2", plotH);

  // Y tick marks + labels (number of artworks)
  yTicks.forEach(rowCount => {
    const artworkCount = rowCount * dotsPerRow;
    const y = yScale(rowCount);

    g.append("line")
      .attr("x1", -4).attr("y1", y)
      .attr("x2",  0).attr("y2", y)
      .attr("stroke", "#555")
      .attr("stroke-width", 0.75);

    g.append("text")
      .attr("x", -7).attr("y", y)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "8px")
      .attr("font-family", "Georgia, serif")
      .attr("fill", "#777")
      .text(artworkCount > 0 ? artworkCount : "");
  });

  // Y axis title
  g.append("text")
    .attr("transform", `translate(-32, ${plotH / 2}) rotate(-90)`)
    .attr("text-anchor", "middle")
    .attr("font-size", "9px")
    .attr("font-family", "Georgia, serif")
    .attr("fill", "#777")
    .attr("letter-spacing", "0.06em")
    .text("NUMBER OF WORKS");

  // ── X axis ──
  g.append("line")
    .attr("class", "axis-line")
    .attr("x1", 0).attr("y1", plotH)
    .attr("x2", plotW).attr("y2", plotH);

  // ── Dot columns + x-axis labels ──
  CATEGORY_ORDER.forEach((cat, i) => {
    const items = byCategory.get(cat) || [];
    const cfg   = CATEGORY_CONFIG[cat] || { icon: "●", color: "#999", label: cat };
    const cx    = (i + 0.5) * colWidth;  // center of this column

    const catG = g.append("g")
      .attr("class", `cat-group cat-${cat}`)
      .attr("transform", `translate(${cx}, 0)`);

    // Dots grow upward from the x-axis
    items.forEach((d, j) => {
      const col = j % dotsPerRow;
      const row = Math.floor(j / dotsPerRow);

      // x: centered in column; y: from bottom upward
      const dx = (col - dotsPerRow / 2 + 0.5) * DOT_STEP;
      const dy = plotH - (row + 0.5) * DOT_STEP - 3;

      catG.append("text")
        .attr("class", "dot")
        .attr("data-cat", cat)
        .attr("x", dx)
        .attr("y", dy)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", `${DOT_SIZE}px`)
        .attr("fill", cfg.color)
        .text(cfg.icon)
        .datum(d)
        .on("mouseenter", (e, d) => showTooltip(e, d))
        .on("mousemove",  (e)    => moveTooltip(e))
        .on("mouseleave", ()     => hideTooltip());
    });

    // X axis tick
    g.append("line")
      .attr("x1", cx).attr("y1", plotH)
      .attr("x2", cx).attr("y2", plotH + 4)
      .attr("stroke", "#555")
      .attr("stroke-width", 0.75);

    // X axis label (category name)
    g.append("text")
      .attr("class", "axis-label")
      .attr("x", cx)
      .attr("y", plotH + 14)
      .text(cfg.label.toUpperCase());

    // Count below label
    g.append("text")
      .attr("class", "cat-count")
      .attr("x", cx)
      .attr("y", plotH + 25)
      .text(items.length);
  });
}

// ─── SCROLL STEP LOGIC ───────────────────────────────────────────────────────

function applyStep(step) {
  currentStep = step;

  // Reset
  mainSvg.selectAll(".dot").classed("dimmed", false);

  switch (step) {

    case 0:
      // All visible, but abstract highlighted — everything else dimmed
      mainSvg.selectAll(".dot")
        .filter(function() {
          return d3.select(this).attr("data-cat") !== "abstract";
        })
        .classed("dimmed", true);
      break;

    case 1:
      // TODO: Your first story beat
      // Example: highlight florals
      mainSvg.selectAll(".dot")
        .filter(function() {
          return d3.select(this).attr("data-cat") !== "florals";
        })
        .classed("dimmed", true);
      break;

    case 2:
      // TODO: Your second story beat
      break;

    case 3:
      // All visible — invite exploration
      break;
  }
}

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────

function showTooltip(event, d) {
  let html = "";
  if (d.image_url && d.image_url.trim()) {
    html += `<img src="${d.image_url.trim()}" alt="${d.title || "artwork"}" />`;
  }
  html += `<div class="tt-title">${d.title || "Untitled"}</div>`;
  if (d.artist && d.artist.trim()) {
    html += `<div class="tt-artist">${d.artist}</div>`;
  }
  const meta = [d.station, d.borough, d.year].filter(v => v && v.trim()).join(" · ");
  if (meta) html += `<div class="tt-meta">${meta}</div>`;

  tooltip.html(html).classed("hidden", false);
  moveTooltip(event);
}

function moveTooltip(event) {
  const ttW = 260, ttH = 220;
  let x = event.clientX + 16;
  let y = event.clientY - 10;
  if (x + ttW > window.innerWidth)  x = event.clientX - ttW - 16;
  if (y + ttH > window.innerHeight) y = window.innerHeight - ttH - 10;
  tooltip.style("left", x + "px").style("top", y + "px");
}

function hideTooltip() {
  tooltip.classed("hidden", true);
}

// ─── SCROLLAMA ───────────────────────────────────────────────────────────────

function initScrollama() {
  const scroller = scrollama();

  scroller
    .setup({ step: ".step", offset: 0.5, debug: false })
    .onStepEnter(({ index }) => {
      d3.selectAll(".step").classed("is-active", false);
      d3.select(`.step[data-step="${index}"]`).classed("is-active", true);
      applyStep(index);
    })
    .onStepExit(({ index, direction }) => {
      if (direction === "up" && index === 0) {
        d3.selectAll(".step").classed("is-active", false);
        applyStep(-1);
      }
    });

  window.addEventListener("resize", scroller.resize);
}
