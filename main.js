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

const DOT_SIZE = 11;
const DOT_GAP  = 4;
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
    drawBoroughMap();
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

    const dotsPerRow = Math.max(3, Math.floor(halfW * 0.55 / DOT_STEP));
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

  const margin = { top: 30, right: 20, bottom: 55, left: 52 };
  const plotW  = W - margin.left - margin.right;
  const plotH  = H - margin.top  - margin.bottom;

  const g = mainSvg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // ── Layout ──────────────────────────────────────────────────────────────────
  const nCats    = CATEGORY_ORDER.length;
  const colWidth = plotW / nCats;

  // Fixed dot sizing — large enough to see and hover
  const DOT_SP = 16;   // step (size + gap)
  const DOT_S  = 13;   // font-size for icon character
  // Fit dots across 72% of each column — never fewer than 3, never more than 6
  const perRow = Math.min(6, Math.max(3, Math.floor(colWidth * 0.72 / DOT_SP)));

  const maxItems = d3.max(CATEGORY_ORDER, cat => (byCategory.get(cat) || []).length);
  const maxRows  = Math.ceil(maxItems / perRow);
  const colTop   = plotH - maxRows * DOT_SP;  // y where tallest column starts

  // ── Y axis ──────────────────────────────────────────────────────────────────
  g.append("line")
    .attr("class", "axis-line")
    .attr("x1", 0).attr("y1", colTop - 10)  /* extend 10px above tallest column */
    .attr("x2", 0).attr("y2", plotH);

  // Ticks at every 25 artworks, derived purely from geometry
  d3.range(25, maxItems + 1, 25).forEach(count => {
    const rows = Math.ceil(count / perRow);
    const y    = plotH - rows * DOT_SP;
    g.append("line")
      .attr("x1", -5).attr("y1", y).attr("x2", 0).attr("y2", y)
      .attr("stroke", "#888").attr("stroke-width", 0.75);
    g.append("text")
      .attr("x", -8).attr("y", y)
      .attr("text-anchor", "end").attr("dominant-baseline", "middle")
      .attr("font-size", "12px").attr("font-family", "Georgia, serif")
      .attr("fill", "#888")
      .text(count);
  });

  g.append("text")
    .attr("transform", `translate(-42, ${(plotH + colTop) / 2}) rotate(-90)`)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px").attr("font-family", "Georgia, serif")
    .attr("fill", "#aaa").attr("letter-spacing", "0.06em")
    .text("NUMBER OF WORKS");

  // ── X axis ──────────────────────────────────────────────────────────────────
  g.append("line")
    .attr("class", "axis-line")
    .attr("x1", -8).attr("y1", plotH)   /* extend 8px left past y-axis */
    .attr("x2", plotW + 10).attr("y2", plotH);  /* extend 10px right past last column */

  // ── Dot columns ─────────────────────────────────────────────────────────────
  CATEGORY_ORDER.forEach((cat, i) => {
    const items = byCategory.get(cat) || [];
    const cfg   = CATEGORY_CONFIG[cat] || { icon: "●", color: "#999", label: cat };
    const cx    = (i + 0.5) * colWidth;

    const catG = g.append("g")
      .attr("class", `cat-group cat-${cat}`)
      .attr("transform", `translate(${cx}, 0)`);

    items.forEach((artwork, j) => {
      const col = j % perRow;
      const row = Math.floor(j / perRow);
      const dx  = (col - perRow / 2 + 0.5) * DOT_SP;
      const dy  = plotH - (row + 0.5) * DOT_SP;

      catG.append("text")
        .datum(artwork)                 // bind datum FIRST so event handler receives it
        .attr("class", "dot")
        .attr("data-cat", cat)
        .attr("x", dx).attr("y", dy)
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("font-size", `${DOT_S}px`)
        .attr("fill", cfg.color)
        .text(cfg.icon)
        .on("mouseenter", (event, d) => showTooltip(event, d))
        .on("mousemove",  (event)    => moveTooltip(event))
        .on("mouseleave", ()         => hideTooltip());
    });

    // X tick — slightly longer
    g.append("line")
      .attr("x1", cx).attr("y1", plotH)
      .attr("x2", cx).attr("y2", plotH + 8)
      .attr("stroke", "#888").attr("stroke-width", 0.75);

    // Horizontal label
    g.append("text")
      .attr("class", "axis-label")
      .attr("x", cx)
      .attr("y", plotH + 20)
      .attr("text-anchor", "middle")
      .text(cfg.label);

    g.append("text")
      .attr("class", "cat-count")
      .attr("x", cx)
      .attr("y", plotH + 33)
      .attr("text-anchor", "middle")
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

// ─── BOROUGH MAP ─────────────────────────────────────────────────────────────

function drawBoroughMap() {
  // Reliable GitHub-hosted NYC boroughs GeoJSON (boro_name property)
  const GEO_URL = "https://raw.githubusercontent.com/dwillis/nyc-maps/master/boroughs.geojson";

  // Count artworks per borough from allData
  const boroughCounts = {};
  allData.forEach(d => {
    const b = (d.borough || "").trim();
    if (b) boroughCounts[b] = (boroughCounts[b] || 0) + 1;
  });

  // Normalize CSV "Bronx" → GeoJSON "The Bronx"
  if (boroughCounts["Bronx"] && !boroughCounts["The Bronx"]) {
    boroughCounts["The Bronx"] = boroughCounts["Bronx"];
    delete boroughCounts["Bronx"];
  }

  const mapSvg = d3.select("#borough-map-svg");
  const boroughTip = d3.select("#borough-tooltip");

  d3.json(GEO_URL).then(geo => {
    // Fixed coordinate space — CSS width:100% handles scaling
    const W = 960;
    const H = 680;
    mapSvg.attr("viewBox", `0 0 ${W} ${H}`);

    const projection = d3.geoMercator().fitSize([W, H], geo);
    const path       = d3.geoPath().projection(projection);

    const counts = Object.values(boroughCounts);
    const colorScale = d3.scaleSequential()
      .domain([0, d3.max(counts)])
      .interpolator(d3.interpolate("#ffc3be", "#C0392B"));

    // Detect which property holds the borough name
    const sampleProps = geo.features[0]?.properties || {};
    const nameKey = Object.keys(sampleProps).find(k =>
      /boro/i.test(k) && /name/i.test(k)
    ) || Object.keys(sampleProps)[0];

    mapSvg.selectAll(".borough-path")
      .data(geo.features)
      .join("path")
        .attr("class", "borough-path")
        .attr("d", path)
        .attr("fill", feat => {
          const name  = feat.properties[nameKey];
          const count = boroughCounts[name] || 0;
          return colorScale(count);
        })
        .on("mouseenter", (event, feat) => {
          const name  = feat.properties[nameKey];
          const count = boroughCounts[name] || 0;
          boroughTip
            .html(`<div class="bt-name">${name}</div><div class="bt-count">${count} artwork${count !== 1 ? "s" : ""}</div>`)
            .classed("hidden", false);
          moveBoroughTip(event);
        })
        .on("mousemove", (event) => moveBoroughTip(event))
        .on("mouseleave", () => boroughTip.classed("hidden", true));

    // Labels centered on each borough
    mapSvg.selectAll(".borough-label")
      .data(geo.features)
      .join("text")
        .attr("class", "borough-label")
        .attr("transform", feat => `translate(${path.centroid(feat)})`)
        .attr("dy", "-0.3em")
        .text(feat => feat.properties[nameKey]);

    mapSvg.selectAll(".borough-count")
      .data(geo.features)
      .join("text")
        .attr("class", "borough-count")
        .attr("transform", feat => `translate(${path.centroid(feat)})`)
        .attr("dy", "1em")
        .text(feat => {
          const count = boroughCounts[feat.properties[nameKey]] || 0;
          return `${count} works`;
        });

  }).catch(err => console.error("Borough GeoJSON error:", err));
}

function moveBoroughTip(event) {
  const ttW = 160, ttH = 60;
  let x = event.clientX + 16;
  let y = event.clientY - 10;
  if (x + ttW > window.innerWidth)  x = event.clientX - ttW - 16;
  if (y + ttH > window.innerHeight) y = window.innerHeight - ttH - 10;
  d3.select("#borough-tooltip").style("left", x + "px").style("top", y + "px");
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