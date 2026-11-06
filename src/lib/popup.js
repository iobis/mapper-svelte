import { config } from "./config.js";
import { formatNumber } from "./format.js";

function years(range) {
  if (!range || range[0] == null || range[1] == null) return null;
  const start = Math.round(range[0]);
  const end = Math.round(range[1]);
  return start === end ? String(start) : `${start}–${end}`;
}

function countLabel(value, singular, plural) {
  const count = Number(value) || 0;
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

function plain(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function datasetItem(record) {
  const item = document.createElement("li");
  const line = document.createElement("div");
  line.className = "dataset-line";
  const link = document.createElement("a");
  link.href = `${config.portal}dataset/${record.id}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = record.title || record.id;
  const count = document.createElement("span");
  count.textContent = `${formatNumber(record.records)} records`;
  line.append(link, count);
  item.append(line);
  const abstract = plain(record.abstract);
  if (abstract) {
    const text = document.createElement("p");
    text.className = "abstract";
    text.textContent = abstract;
    item.append(text);
  }
  return item;
}

export function popupNode({ statistics, title, pageSize, firstPage, loadPage }) {
  const root = document.createElement("div");
  root.className = "popup";
  if (title) {
    const heading = document.createElement("p");
    heading.className = "popup-title";
    heading.textContent = title;
    root.append(heading);
  }

  const records = statistics?.records ?? 0;
  const overview = document.createElement("p");
  overview.className = "popup-overview";
  if (!records) {
    overview.textContent = "No records in this cell.";
    root.append(overview);
    return root;
  }

  const parts = [
    countLabel(records, "record", "records"),
    countLabel(statistics.species, "species", "species"),
    countLabel(statistics.taxa, "taxon", "taxa"),
    countLabel(statistics.datasets, "dataset", "datasets"),
  ];
  const yearLabel = years(statistics.yearrange);
  if (yearLabel) parts.push(yearLabel);
  overview.textContent = parts.join(" · ");
  root.append(overview);

  const datasets = document.createElement("div");
  datasets.className = "popup-datasets";
  const pager = document.createElement("div");
  pager.className = "pager";
  const previous = document.createElement("button");
  previous.type = "button";
  previous.textContent = "Previous";
  const pageLabel = document.createElement("span");
  const next = document.createElement("button");
  next.type = "button";
  next.textContent = "Next";
  pager.append(previous, pageLabel, next);
  const list = document.createElement("ul");
  list.className = "dataset-list";
  datasets.append(pager, list);
  root.append(datasets);

  let pageIndex = 0;
  let page = firstPage || [];
  let loading = false;

  function paint() {
    pageLabel.textContent = String(pageIndex + 1);
    previous.disabled = pageIndex === 0 || loading;
    next.disabled = page.length < pageSize || loading;
    list.replaceChildren(...(page.length ? page.map(datasetItem) : []));
    if (!page.length) {
      const empty = document.createElement("li");
      empty.textContent = "No datasets.";
      list.append(empty);
    }
  }

  async function go(index) {
    if (loading || index < 0) return;
    if (index > pageIndex && page.length < pageSize) return;
    loading = true;
    paint();
    try {
      page = await loadPage(index);
      pageIndex = index;
    } catch {
      // Keep the page that is already on screen.
    } finally {
      loading = false;
      paint();
    }
  }

  previous.addEventListener("click", () => go(pageIndex - 1));
  next.addEventListener("click", () => go(pageIndex + 1));
  paint();
  return root;
}
