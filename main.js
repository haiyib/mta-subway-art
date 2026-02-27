// ═══════════════════════════════════════════════════════════════════════════════
//  MTA Subway Art — D3 + Scrollama
//  Each dot = 1 artwork. Hover to see details. Scroll to reveal the story.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const DATA_PATH = "data/artworks.csv";

// Category config: icon character, color, display label
// TODO: Swap icon characters for proper SVG symbols once you've decided on them.
//       Right now these are Unicode stand-ins so you can see the layout.
//       Suggested icons to replace:
//         florals   → a custom SVG flower path
//         humans    → a person silhouette path
//         animals   → a paw / bird / fish path matching your data
//         cityscape → a building outline
//         landscape → a mountain / tree
//         abstract  → a geometric diamond or star
//         culture   → a mask / instrument
//         objects   → a box / lamp
//         words     → a speech bubble / quotation mark
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

// Order of categories in the 3×3 grid (matches your notebook layout)
// TODO: Adjust to match the exact category names in your CSV's "category" column
const CATEGORY_ORDER = [
  "abstract",  "humans",   "cityscape",
  "florals",   "animals",  "landscape",
  "culture",   "objects",  "words",
];

const GRID_COLS    = 3;   // categories per row
const DOTS_PER_ROW = 12;  // dots per row within a single category block
const DOT_SIZE     = 12;  // px — font size of each icon character
const DOT_GAP      = 4;   // px gap between dots
const DOT_STEP     = DOT_SIZE + DOT_GAP;

// ─── STATE ───────────────────────────────────────────────────────────────────

let allData       = [];   // all parsed CSV rows
let byCategory    = {};   // Map: category string → array of row objects
let currentStep   = -1;

// ─── SVG + TOOLTIP SETUP ─────────────────────────────────────────────────────

const svg     = d3.select("#chart");
const tooltip = d3.select("#tooltip");

let W, H;   // chart dimensions in px

function measure() {
  const el = document.getElementById("chart");
  W = el.clientWidth;
  H = el.clientHeight;
  svg.attr("viewBox", `0 0 ${W} ${H}`);
}

// ─── LOAD DATA ───────────────────────────────────────────────────────────────

Papa.parse(DATA_PATH, {
  download:       true,
  header:         true,
  skipEmptyLines: true,
  complete: ({ data }) => {
    allData = data;

    // Normalise category values to lowercase so they match CATEGORY_CONFIG keys
    allData.forEach(d => {
      d.category = (d.category || "").toLowerCase().trim();
    });

    byCategory = d3.group(allData, d => d.category);

    measure();
    drawChart();
    initScrollama();
  },
  error: (err) => {
    console.error("CSV load error:", err);
  },
});

window.addEventListener("resize", () => {
  measure();
  drawChart();
  applyStep(currentStep);
});

// ─── DRAW ─────────────────────────────────────────────────────────────────────

function drawChart() {
  svg.selectAll("*").remove();

  const gridRows = Math.ceil(CATEGORY_ORDER.length / GRID_COLS);
  const padX = 32, padY = 40;

  const cellW = (W - padX * 2) / GRID_COLS;
  const cellH = (H - padY * 2) / gridRows;

  CATEGORY_ORDER.forEach((cat, i) => {
    const col  = i % GRID_COLS;
    const row  = Math.floor(i / GRID_COLS);
    const cx   = padX + col * cellW + cellW / 2;
    const cy   = padY + row * cellH + cellH / 2;

    const cfg   = CATEGORY_CONFIG[cat] || { icon: "●", color: "#999", label: cat };
    const items = byCategory.get(cat) || [];

    const g = svg.append("g")
      .attr("class", `cat-group cat-${cat}`)
      .attr("transform", `translate(${cx}, ${cy})`);

    // ── Dot matrix ──────────────────────────────────────────────────────────
    const dotsWide = Math.min(items.length, DOTS_PER_ROW);
    const dotsHigh = Math.ceil(items.length / DOTS_PER_ROW);

    // Centre the matrix vertically within the cell
    const matrixH = dotsHigh * DOT_STEP;
    const offsetY = -(matrixH / 2);   // shift up so label has room below

    items.forEach((d, j) => {
      const dotCol = j % DOTS_PER_ROW;
      const dotRow = Math.floor(j / DOTS_PER_ROW);

      // x: centred around 0
      const dx = (dotCol - dotsWide / 2 + 0.5) * DOT_STEP;
      // y: top of matrix + row offset
      const dy = offsetY + dotRow * DOT_STEP;

      g.append("text")
        .attr("class", "dot")
        .attr("data-cat", cat)
        .attr("x", dx)
        .attr("y", dy)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", `${DOT_SIZE}px`)
        .attr("fill", cfg.color)
        .text(cfg.icon)
        .datum(d)   // bind the data row so tooltip can access it
        .on("mouseenter", (event, d) => showTooltip(event, d))
        .on("mousemove",  (event)    => moveTooltip(event))
        .on("mouseleave", ()         => hideTooltip());
    });

    // ── Category label + count ───────────────────────────────────────────────
    const labelY = offsetY + matrixH + 10;

    g.append("text")
      .attr("class", "cat-label")
      .attr("y", labelY)
      .text(cfg.label.toUpperCase());

    g.append("text")
      .attr("class", "cat-count")
      .attr("y", labelY + 14)
      .text(`${items.length} work${items.length !== 1 ? "s" : ""}`);
  });
}

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────

function showTooltip(event, d) {
  let html = "";

  // Image (only shown if image_url column is filled in)
  if (d.image_url && d.image_url.trim()) {
    html += `<img src="${d.image_url.trim()}" alt="${d.title || "artwork"}" />`;
  }

  html += `<div class="tt-title">${d.title || "Untitled"}</div>`;

  if (d.artist && d.artist.trim()) {
    html += `<div class="tt-artist">${d.artist}</div>`;
  }

  const meta = [d.station, d.borough, d.year].filter(v => v && v.trim()).join(" · ");
  if (meta) {
    html += `<div class="tt-meta">${meta}</div>`;
  }

  tooltip.html(html).classed("hidden", false);
  moveTooltip(event);
}

function moveTooltip(event) {
  const ttW = 270;
  const ttH = 220;
  let x = event.clientX + 16;
  let y = event.clientY - 10;

  // Keep tooltip inside viewport
  if (x + ttW > window.innerWidth)  x = event.clientX - ttW - 16;
  if (y + ttH > window.innerHeight) y = window.innerHeight - ttH - 10;

  tooltip.style("left", x + "px").style("top", y + "px");
}

function hideTooltip() {
  tooltip.classed("hidden", true);
}

// ─── SCROLL STEP LOGIC ───────────────────────────────────────────────────────
// Each case corresponds to a data-step="N" in index.html.
// Modify these to tell your story: dim categories, change colors, resize dots.

function applyStep(step) {
  currentStep = step;

  // Reset everything first
  svg.selectAll(".dot").classed("dimmed", false);

  switch (step) {

    case 0:
      // ── Overview: show all categories equally ──
      // Nothing to do — reset above is sufficient.
      break;

    case 1:
      // ── TODO: Highlight one category, dim the rest ──
      // Example below highlights "abstract". Change to match your story beat.
      svg.selectAll(".dot")
        .filter(function() {
          return d3.select(this).attr("data-cat") !== "abstract";
        })
        .classed("dimmed", true);
      break;

    case 2:
      // ── TODO: Your second story beat ──
      // Example: highlight two categories
      svg.selectAll(".dot")
        .filter(function() {
          const cat = d3.select(this).attr("data-cat");
          return cat !== "florals" && cat !== "animals";
        })
        .classed("dimmed", true);
      break;

    case 3:
      // ── Everything visible — invite exploration ──
      // No dimming. All dots are interactive.
      break;

    // Add more cases here as you add more .step divs in index.html
  }
}

// ─── SCROLLAMA INIT ──────────────────────────────────────────────────────────

function initScrollama() {
  const scroller = scrollama();

  scroller
    .setup({
      step:    ".step",
      offset:  0.5,      // trigger when step hits 50% of viewport height
      debug:   false,    // set true to see the trigger line while building
    })
    .onStepEnter(({ index, direction }) => {
      // Highlight the active step card
      d3.selectAll(".step").classed("is-active", false);
      d3.select(`.step[data-step="${index}"]`).classed("is-active", true);

      applyStep(index);
    })
    .onStepExit(({ index, direction }) => {
      // When scrolling back above the first step, reset chart
      if (direction === "up" && index === 0) {
        d3.selectAll(".step").classed("is-active", false);
        applyStep(-1);
      }
    });

  window.addEventListener("resize", scroller.resize);
}
