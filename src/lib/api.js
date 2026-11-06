import { config } from "./config.js";
import { blankFromQuery } from "./query.js";

async function getJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

let areasPromise = null;

async function lookupAll(ids, fetchOne) {
  if (!ids?.length) return [];
  const rows = await Promise.all(ids.map((id) => fetchOne(id).catch(() => null)));
  return rows.filter(Boolean);
}

export function taxon(id) {
  return getJson(`${config.api}taxon/${encodeURIComponent(id)}`).then((data) => data.results?.[0] || null);
}

export function dataset(id) {
  return getJson(`${config.api}dataset/${encodeURIComponent(id)}`).then((data) => data.results?.[0] || null);
}

export function datasetsByIds(ids) {
  if (!ids.length) return Promise.resolve([]);
  const path = ids.map((id) => encodeURIComponent(id)).join(",");
  return getJson(`${config.api}dataset/${path}`).then((data) => data.results || []);
}

export function node(id) {
  return getJson(`${config.api}node/${encodeURIComponent(id)}`).then((data) => data.results?.[0] || null);
}

export function institute(id) {
  return getJson(`${config.api}institute/${encodeURIComponent(id)}`).then((data) => data.results?.[0] || null);
}

export function country(id) {
  return getJson(`${config.api}country/${encodeURIComponent(id)}`).then((data) => data.results?.[0] || null);
}

export function area(id) {
  return getJson(`${config.api}area/${encodeURIComponent(id)}`).then((data) => data.results?.[0] || null);
}

export function getAreas() {
  if (!areasPromise) {
    areasPromise = getJson(`${config.api}area`)
      .then((data) => data.results || [])
      .catch((error) => {
        areasPromise = null;
        throw error;
      });
  }
  return areasPromise;
}

export async function completeArea(input) {
  const [matches, areas] = await Promise.all([
    getJson(`${config.api}area/complete/${encodeURIComponent(input)}`),
    getAreas(),
  ]);
  const typeById = {};
  for (const area of areas) typeById[String(area.id)] = area.type;
  return (matches || []).map((item) => ({ ...item, type: typeById[String(item.id)] }));
}

export function complete(input) {
  return getJson(`${config.api}taxon/complete/verbose/${encodeURIComponent(input)}`);
}

export function completeDataset(input) {
  return getJson(`${config.api}dataset/complete/${encodeURIComponent(input)}`);
}

export function completeNode(input) {
  return getJson(`${config.api}node/complete/${encodeURIComponent(input)}`);
}

export function completeInstitute(input) {
  return getJson(`${config.api}institute/complete/${encodeURIComponent(input)}`);
}

export function completeCountry(input) {
  return getJson(`${config.api}country/complete/${encodeURIComponent(input)}`);
}

export function count(criteria, createQuery) {
  return getJson(`${config.api}occurrence?${createQuery({ ...criteria, size: 0 })}`).then((data) => data.total);
}

export function occurrences(criteria, createQuery) {
  return getJson(`${config.api}occurrence?${createQuery(criteria)}`);
}

export function checklist(criteria, createQuery) {
  return getJson(`${config.api}checklist?${createQuery(criteria)}`);
}

export function datasets(criteria, createQuery) {
  return getJson(`${config.api}dataset?${createQuery(criteria)}`);
}

export function statistics(criteria, createQuery) {
  return getJson(`${config.api}statistics?${createQuery(criteria)}`);
}

export function years(criteria, createQuery) {
  return getJson(`${config.api}statistics/years?${createQuery(criteria)}`);
}

export function geoPoint(criteria, x, y, z, createQuery) {
  const zoom = z == null ? "" : `/${Math.round(z)}`;
  return getJson(`${config.api}occurrence/point/${x}/${y}${zoom}?${createQuery(criteria)}`);
}

export function requestDownload(criteria, email, createQuery) {
  const query = createQuery(criteria);
  fetch(`${config.api}metrics/logusage?agent=mapper&${query}`).catch(() => {});
  return getJson(`${config.download}occurrence?email=${encodeURIComponent(email)}&${query}`);
}

export function downloadStatus(id) {
  return getJson(`${config.download}${encodeURIComponent(id)}/status`);
}

export async function resolveQuery(query) {
  const base = blankFromQuery(query);
  const [taxa, datasets, nodes, areas, countries, institutes, areaList] = await Promise.all([
    lookupAll(query.taxonid, taxon),
    lookupAll(query.datasetid, dataset),
    lookupAll(query.nodeid, node),
    lookupAll(query.areaid, area),
    lookupAll(query.countryid, country),
    lookupAll(query.instituteid, institute),
    getAreas().catch(() => []),
  ]);
  const typeById = {};
  for (const item of areaList) typeById[String(item.id)] = item.type;
  return {
    ...base,
    taxa: taxa.map((item) => ({
      scientificName: item.scientificName,
      scientificNameAuthorship: item.scientificNameAuthorship,
      acceptedNameUsageID: item.acceptedNameUsageID || item.taxonID || item.id,
    })),
    datasets: datasets.map((item) => ({ id: item.id, title: item.title })),
    nodes: nodes.map((item) => ({ id: item.id, name: item.name })),
    institutes: institutes.map((item) => ({ id: item.id, name: item.name })),
    areas: areas.map((item) => ({ id: item.id, name: item.name, type: item.type || typeById[String(item.id)] })),
    countries: countries.map((item) => ({ id: item.id, country: item.country })),
  };
}
