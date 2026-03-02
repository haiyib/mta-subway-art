# Have you seen me in the subway?
### A visual census of artwork across New York City's subway system

**By Haiyi Bi** · [Live site](https://[your-github-username].github.io/mta-subway-art/)

---

## What I set out to do

New York City's subway is one of the largest public art galleries in the world — but most riders walk past it every day without noticing. I wanted to visualize the full scope of MTA subway art and ask: *what subjects do these works actually depict?* My goal was to build a scrollytelling data story that lets readers explore nearly 500 artworks by subject category, using an interactive dot-matrix chart where every single dot represents a real piece of art.

---

## What I found

- **Abstract work dominates** — with [154] pieces, it makes up roughly a third of the entire collection, far more than any other category.
- **Human figures are the second most common subject** ([90] works), reflecting the MTA's long tradition of commissioning art that centers New Yorkers themselves.
- **Florals, animals, and cityscapes cluster closely** in the 40–50 range, suggesting these are reliable, well-funded subject areas.
- **Words and culture are the rarest categories** — [12] and [25] works respectively — which raises questions about whether certain subjects are harder to fund or less favored by selection committees.
- [Add any other patterns or surprises you noticed in the data here.]

---

## Data collection

The artwork data was collected from the [NYC Subway Art Guide](https://www.nycsubway.org/perl/artwork), a community-maintained database of MTA public art installations.

Each record includes the artist name, artwork title, station, subway line, borough, zip code, and year of installation. Subject categories were assigned manually by our team based on the visual content of each work.

**Data file:** `data/artworks.csv` (487 records)

**Collaborators on data collection and categorization:**
Craig Bonder, Haiyi Bi, Melinda Yao, Mika Yassur, and Ziyuan Yin.

---

## Data analysis

1. **Categorization** — Each artwork was reviewed and assigned to one of nine subject categories: Abstract, Humans, Cityscape, Florals, Animals, Landscape, Culture, Objects, and Words. Some artworks appeared in multiple categories; we assigned the dominant subject.
2. **Counting** — Category totals were computed from the CSV. The `Absract` typo in the raw data was normalized programmatically in the visualization code.
3. **Exploration** — Initial analysis was done in Python (see `test.ipynb` and `version1.ipynb`) using matplotlib dot-matrix charts to understand the distribution before building the web version.

---

## New skills and growth

This project pushed me into several areas I hadn't worked in before:

- **D3.js** — I had no prior experience with D3. Building a coordinate chart with custom dot-matrix columns, dynamic sizing, and hover tooltips from scratch was the steepest learning curve of the project.
- **Scrollama.js** — I learned how scrollytelling works: the sticky figure pattern, step triggers, and how to connect scroll position to chart state.
- **Responsive SVG layout** — Figuring out how to make an SVG chart resize correctly across viewports, especially computing dot size and dots-per-row dynamically from available pixel width, required a lot of trial and error.
- **Editorial data design** — Taking inspiration from publications like The Pudding and jsoma's templates taught me how typography, spacing, and a restrained color palette can make data feel more like a story than a spreadsheet.
- **Debugging DOM and data pipelines** — Tracing issues from CSV column name mismatches to broken variable scopes in JavaScript helped me understand how data flows through a web visualization end to end.

---

## What I wanted to do but didn't get to

- **Custom SVG shapes per category** — The original vision was for each dot to be shaped like its category: a flower for florals, a person silhouette for humans, an animal for animals, etc. I ran out of time to design and implement custom D3 symbol paths for all nine categories. The Unicode icon stand-ins work, but the shaped symbols would have been much more expressive.
- **Artwork images in tooltips** — The tooltip is wired to show a photo on hover, but the dataset doesn't include image URLs. Scraping or manually linking artwork photos would make the hover interaction dramatically more engaging.
- **Borough/line breakdown** — The data includes station, borough, and subway line for every artwork. A second chart showing the geographic distribution (e.g., which boroughs have the most art, or which lines are richest in culture) would add another layer to the story.
- **Animation between scroll steps** — Right now, transitioning between steps just dims and undims dots instantly. A smooth animated transition — dots fading in one category at a time, or reorganizing into a new layout — would feel much more polished.
- **Mobile layout** — The scrollytelling layout collapses on small screens but wasn't optimized or tested on mobile. A proper mobile-first version would need a different chart layout entirely.

---

## How to run locally

```bash
# Clone the repo
git clone https://github.com/[your-github-username]/mta-subway-art.git
cd mta-subway-art

# Serve with any static file server (required — CSV fetch won't work from file://)
python3 -m http.server 8000
# then open http://localhost:8000
```

---

## Tech stack

| Tool | Purpose |
|---|---|
| [D3.js v7](https://d3js.org) | Dot-matrix chart, axes, tooltips |
| [Scrollama.js](https://github.com/russellsamora/scrollama) | Scroll-triggered step logic |
| [PapaParse](https://www.papaparse.com) | CSV parsing in the browser |
| [Lora](https://fonts.google.com/specimen/Lora) (Google Fonts) | Display typography |
| HTML / CSS / vanilla JS | Everything else — no build step |
