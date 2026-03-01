// ═══════════════════════════════════════════════════════════════════════════════
//  MTA Subway Art — D3 + Scrollama
// ═══════════════════════════════════════════════════════════════════════════════

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const DATA_PATH = "data/artworks.csv";

const CATEGORY_CONFIG = {
  "abstract":  { icon: "◈", color: "#4a4a4a", label: "Abstract"  },
  "human":     { icon: "◎", color: "#3A7CA5", label: "Humans"    },
  "cityscape": { icon: "⬛", color: "#7B5EA7", label: "Cityscape" },
  "floral":    { icon: "✿", color: "#E8697D", label: "Florals"   },
  "animal":    { icon: "◉", color: "#4CAF50", label: "Animals"   },
  "landscape": { icon: "◭", color: "#2E8B57", label: "Landscape" },
  "culture":   { icon: "◈", color: "#C0392B", label: "Culture"   },
  "object":    { icon: "⬡", color: "#E67E22", label: "Objects"   },
  "words":     { icon: "❝", color: "#1F9D8A", label: "Words"     },
};

const CATEGORY_ORDER = [
  "abstract", "human", "cityscape", "animal",
  "floral", "landscape", "object", "culture", "words",
];

const HERO_CATEGORIES = ["abstract", "floral"];

const DOT_SIZE = 8;
const DOT_GAP  = 2;
const DOT_STEP = DOT_SIZE + DOT_GAP;

// ─── STATE ───────────────────────────────────────────────────────────────────

let allData    = [];
let byCategory = {};
let currentStep = -1;

// ─── SVG ELEMENTS ────────────────────────────────────────────────────────────

const mainSvg = d3.select("#chart");
const heroSvg = d3.select("#hero-chart");
const tooltip = d3.select("#tooltip");

let W = 0, H = 0;
let HW = 0, HH = 0;

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
      let cat = (d.Category || "").toLowerCase().trim();
      if (cat === "absract") cat = "abstract";
      d.category = cat;
      d.title   = d.Title   || "";
      d.artist  = d.Artist  || "";
      d.station = d.Station || "";
      d.borough = d.Borough || "";
      d.year    = d.Year    || "";
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

// ─── HERO CHART ──────────────────────────────────────────────────────────────

function drawHero() {
  heroSvg.selectAll("*").remove();

  const padX  = 60;
  const padY  = 40;
  const halfW = (HW - padX * 2) / 2;

  HERO_CATEGORIES.forEach((cat, i) => {
    const items = byCategory.get(cat) || [];
    const cfg   = CATEGORY_CONFIG[cat] || { icon: "●", color: "#999", label: cat };

    const cx = padX + i * halfW + halfW / 2;
    const cy = HH / 2 - 20;

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

  // Vertical divider
  heroSvg.append("line")
    .attr("x1", HW / 2).attr("y1", padY)
    .attr("x2", HW / 2).attr("y2", HH - padY)
    .attr("stroke", "rgba(150,180,210,0.5)")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "4,4");
}

// ─── MAIN COORDINATE CHART ───────────────────────────────────────────────────

function drawCoordinateChart() {
  mainSvg.selectAll("*").remove();

  const margin = { top: 30, right: 16, bottom: 72, left: 44 };
  const plotW  = W - margin.left - margin.right;
  const plotH  = H - margin.top  - margin.bottom;

  const g = mainSvg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const nCats    = CATEGORY_ORDER.length;
  const colWidth = plotW / nCats;

  const dotsPerRow = Math.max(3, Math.floor(colWidth * 0.72 / DOT_STEP));
  const maxItems   = d3.max(CATEGORY_ORDER, cat => (byCategory.get(cat) || []).length);
  const maxRows    = Math.ceil(maxItems / dotsPerRow);

  const yScale = d3.scaleLinear()
    .domain([0, maxRows])
    .range([plotH, 0]);

  const yTicks = d3.range(0, maxRows + 1, Math.ceil(maxRows / 5));

  // ── Y axis ──
  g.append("line")
    .attr("class", "axis-line")
    .attr("x1", 0).attr("y1", 0)
    .attr("x2", 0).attr("y2", plotH);

  // Y tick marks + labels
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
    const cx    = (i + 0.5) * colWidth;

    const catG = g.append("g")
      .attr("class", `cat-group cat-${cat}`)
      .attr("transform", `translate(${cx}, 0)`);

    items.forEach((d, j) => {
      const col = j % dotsPerRow;
      const row = Math.floor(j / dotsPerRow);
      const dx  = (col - dotsPerRow / 2 + 0.5) * DOT_STEP;
      const dy  = plotH - (row + 0.5) * DOT_STEP - 3;

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

    g.append("line")
      .attr("x1", cx).attr("y1", plotH)
      .attr("x2", cx).attr("y2", plotH + 4)
      .attr("stroke", "#555")
      .attr("stroke-width", 0.75);

    g.append("text")
      .attr("class", "axis-label")
      .attr("x", cx)
      .attr("y", plotH + 14)
      .text(cfg.label.toUpperCase());

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

  mainSvg.selectAll(".dot").classed("dimmed", false);

  switch (step) {
    case 0:
      mainSvg.selectAll(".dot")
        .filter(function() {
          return d3.select(this).attr("data-cat") !== "abstract";
        })
        .classed("dimmed", true);
      break;

    case 1:
      mainSvg.selectAll(".dot")
        .filter(function() {
          return d3.select(this).attr("data-cat") !== "florals";
        })
        .classed("dimmed", true);
      break;

    case 2:
      break;

    case 3:
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