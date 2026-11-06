import { config } from "./config.js";
import { formatNumber } from "./format.js";

const PREFERRED = [
  "scientificName",
  "aphiaID",
  "dataset_id",
  "node_id",
  "date_year",
  "eventDate",
  "decimalLongitude",
  "decimalLatitude",
  "minimumDepthInMeters",
  "maximumDepthInMeters",
  "institutionCode",
  "collectionCode",
  "catalogNumber",
  "id",
];

function link(href, text) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.textContent = text == null ? "" : String(text);
  return anchor;
}

function cellValue(record, key) {
  const value = record[key];
  if (value == null) return document.createTextNode("");
  if (key === "scientificName" && record.aphiaID) return link(`${config.portal}taxon/${record.aphiaID}`, value);
  if (key === "aphiaID") return link(`${config.portal}taxon/${value}`, value);
  if (key === "dataset_id") return link(`${config.portal}dataset/${value}`, value);
  if (key === "node_id") return link(`${config.portal}node/${value}`, value);
  if (key === "id") return link(`${config.api}occurrence/${value}`, value);
  return document.createTextNode(String(value));
}

export function popupNode(response) {
  const root = document.createElement("div");
  root.className = "popup";
  const intro = document.createElement("p");
  const total = response?.total ?? 0;
  let text = `Found ${formatNumber(total)} record${total === 1 ? "" : "s"}`;
  if (total > 10) text += ", showing the first 10";
  intro.textContent = `${text}.`;
  root.append(intro);

  for (const record of response?.results || []) {
    const table = document.createElement("table");
    const keys = Object.keys(record).sort((a, b) => {
      const ia = PREFERRED.indexOf(a);
      const ib = PREFERRED.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    for (const key of keys) {
      const row = document.createElement("tr");
      const label = document.createElement("td");
      label.textContent = key;
      const value = document.createElement("td");
      value.append(cellValue(record, key));
      row.append(label, value);
      table.append(row);
    }
    root.append(table);
  }
  return root;
}
