import * as api from "./api.js";
import { config } from "./config.js";
import { DEFAULT_OPACITY } from "./palettes.js";
import { validEmails } from "./format.js";
import { phylumClassTree } from "./treemap.js";
import {
  createQuery,
  criteriaFromLayer,
  criteriaKey,
  describe,
  extractQuery,
  hasFilters,
  layerFieldsFromCriteria,
} from "./query.js";

function defaultCriteria() {
  return {
    taxa: [],
    datasets: [],
    nodes: [],
    institutes: [],
    areas: [],
    countries: [],
    timeValues: [null, null],
    depthValues: [null, null],
    scale: "hawaii",
    opacity: DEFAULT_OPACITY,
    showLabels: false,
    wkt: null,
    dropped: "",
    absence: "",
    redlist: false,
    hab: false,
    excludeEdna: false,
    excludeCitizenScience: false,
    flags: null,
    exclude: null,
    hasextensions: { MeasurementOrFact: false, DNADerivedData: false },
  };
}

let nextId = 1;
let toastTimer = 0;
let occurrenceToken = 0;
const datasetTitles = new Map();

export const app = $state({
  layers: [],
  criteria: defaultCriteria(),
  editLayerId: null,
  view: "filters",
  mapMode: true,
  drawing: false,
  toast: "",
  email: "",
  downloadExtensions: { MeasurementOrFact: false, DNADerivedData: false },
  downloadLayerId: null,
  downloads: [],
  selectedLayerId: null,
  statistics: null,
  graph: [],
  taxonomy: null,
  dataLoading: false,
  dataTable: { data: [], pageIndex: 0, after: [null], total: null },
  checklistTable: { data: [], pageIndex: 0, skip: 0, total: null },
  datasetTable: { data: [], pageIndex: 0, skip: 0, total: null },
});

export { criteriaKey, describe, hasFilters };

export function toast(message) {
  app.toast = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    app.toast = "";
  }, 3200);
}

function replaceUrl(query) {
  const next = query ? `${location.pathname}?${query}` : location.pathname;
  history.replaceState(null, "", next);
}

function copyFields(target, fields) {
  for (const key of Object.keys(fields)) target[key] = fields[key];
}

async function refreshCount(layer) {
  const id = layer.id;
  const live = () => app.layers.find((item) => item.id === id);
  const current = live();
  if (!current) return;
  const token = (current.countToken || 0) + 1;
  current.countToken = token;
  try {
    const total = await api.count(criteriaFromLayer(current), createQuery);
    const updated = live();
    if (updated && updated.countToken === token) updated.count = total;
  } catch {
    const updated = live();
    if (updated && updated.countToken === token) toast("Could not count records");
  }
}

export function applyCriteria() {
  const criteria = app.criteria;
  if (!hasFilters(criteria)) {
    if (app.editLayerId != null) {
      app.layers = app.layers.filter((layer) => layer.id !== app.editLayerId);
      app.editLayerId = null;
      replaceUrl("");
    }
    return;
  }

  const fields = layerFieldsFromCriteria(criteria);
  const query = createQuery(criteriaFromLayer(fields));
  const current = app.layers.find((layer) => layer.id === app.editLayerId);
  if (current) {
    const previous = createQuery(criteriaFromLayer(current));
    copyFields(current, fields);
    if (previous !== query) refreshCount(current);
    replaceUrl(query);
    return;
  }

  const layer = { id: nextId++, count: null, pointsMode: false, visible: true, countToken: 0, ...fields };
  app.layers.push(layer);
  app.editLayerId = layer.id;
  refreshCount(layer);
  replaceUrl(query);
}

export function resetCriteria() {
  const fresh = defaultCriteria();
  copyFields(app.criteria, fresh);
}

export function saveLayer() {
  app.editLayerId = null;
  resetCriteria();
  app.view = "layers";
  toast("Layer saved");
}

export function loadCriteria(layer) {
  app.criteria.taxa = layer.taxa.map((item) => ({ ...item }));
  app.criteria.datasets = layer.datasets.map((item) => ({ ...item }));
  app.criteria.nodes = layer.nodes.map((item) => ({ ...item }));
  app.criteria.institutes = layer.institutes.map((item) => ({ ...item }));
  app.criteria.areas = layer.areas.map((item) => ({ ...item }));
  app.criteria.countries = layer.countries.map((item) => ({ ...item }));
  app.criteria.timeValues = [layer.startyear ?? null, layer.endyear ?? null];
  app.criteria.depthValues = [layer.startdepth ?? null, layer.enddepth ?? null];
  app.criteria.scale = layer.scale || "hawaii";
  app.criteria.opacity = layer.opacity ?? DEFAULT_OPACITY;
  app.criteria.showLabels = Boolean(layer.showLabels);
  app.criteria.wkt = layer.geometry || null;
  app.criteria.dropped = layer.dropped || "";
  app.criteria.absence = layer.absence || "";
  app.criteria.redlist = Boolean(layer.redlist);
  app.criteria.hab = Boolean(layer.hab);
  app.criteria.excludeEdna = Boolean(layer.excludeEdna);
  app.criteria.excludeCitizenScience = Boolean(layer.excludeCitizenScience);
  app.criteria.flags = layer.flags || null;
  app.criteria.exclude = layer.exclude || null;
  app.criteria.hasextensions = {
    MeasurementOrFact: Boolean(layer.hasextensions?.MeasurementOrFact),
    DNADerivedData: Boolean(layer.hasextensions?.DNADerivedData),
  };
  app.editLayerId = layer.id;
  app.view = "filters";
}

export function removeLayer(id) {
  app.layers = app.layers.filter((layer) => layer.id !== id);
  if (app.editLayerId === id) {
    app.editLayerId = null;
    resetCriteria();
  }
  if (app.downloadLayerId === id) app.downloadLayerId = null;
}

export function togglePoints(layer) {
  layer.pointsMode = !layer.pointsMode;
}

function selectedLayer() {
  return app.layers.find((layer) => layer.id === app.selectedLayerId) || null;
}

function pageQuery(layer, extra) {
  return { ...criteriaFromLayer(layer), ...extra };
}

export async function viewData(layer) {
  app.selectedLayerId = layer.id;
  app.mapMode = false;
  app.dataTable = { data: [], pageIndex: 0, after: [null], total: null };
  app.checklistTable = { data: [], pageIndex: 0, skip: 0, total: null };
  app.datasetTable = { data: [], pageIndex: 0, skip: 0, total: null };
  app.statistics = null;
  app.graph = [];
  app.taxonomy = null;
  app.dataLoading = true;
  try {
    await Promise.all([fetchOccurrences(), fetchChecklist(), fetchDatasets(), fetchStatistics(), fetchGraph(), fetchTaxonomy()]);
  } catch {
    toast("Could not load the data view");
  } finally {
    app.dataLoading = false;
  }
}

export function showMap() {
  app.mapMode = true;
}

async function attachDatasetTitles(token) {
  const ids = [...new Set(app.dataTable.data.map((record) => record.dataset_id).filter(Boolean))];
  const missing = ids.filter((id) => !datasetTitles.has(id));
  if (missing.length) {
    try {
      const rows = await api.datasetsByIds(missing);
      for (const row of rows) datasetTitles.set(row.id, row.title || "");
      for (const id of missing) if (!datasetTitles.has(id)) datasetTitles.set(id, "");
    } catch {
      return;
    }
  }
  if (token !== occurrenceToken) return;
  for (const record of app.dataTable.data) {
    const title = datasetTitles.get(record.dataset_id);
    if (title) record.datasetTitle = title;
  }
}

export async function fetchOccurrences() {
  const layer = selectedLayer();
  if (!layer) return;
  const data = await api.occurrences(
    pageQuery(layer, { size: config.pageSize, after: app.dataTable.after[app.dataTable.after.length - 1] }),
    createQuery
  );
  const token = ++occurrenceToken;
  app.dataTable.data = data.results || [];
  app.dataTable.total = resultTotal(data);
  await attachDatasetTitles(token);
}

export async function fetchChecklist() {
  const layer = selectedLayer();
  if (!layer) return;
  const data = await api.checklist(pageQuery(layer, { size: config.pageSize, skip: app.checklistTable.skip }), createQuery);
  app.checklistTable.data = data.results || [];
  app.checklistTable.total = resultTotal(data);
}

export async function fetchDatasets() {
  const layer = selectedLayer();
  if (!layer) return;
  const data = await api.datasets(pageQuery(layer, { size: config.datasetPageSize, skip: app.datasetTable.skip }), createQuery);
  app.datasetTable.data = data.results || [];
  app.datasetTable.total = resultTotal(data);
}

export async function fetchStatistics() {
  const layer = selectedLayer();
  if (!layer) return;
  app.statistics = await api.statistics(criteriaFromLayer(layer), createQuery);
}

export async function fetchGraph() {
  const layer = selectedLayer();
  if (!layer) return;
  try {
    const data = await api.years(criteriaFromLayer(layer), createQuery);
    app.graph = Array.isArray(data) ? data : data.results || [];
  } catch {
    app.graph = [];
  }
}

export async function fetchTaxonomy() {
  const layer = selectedLayer();
  if (!layer) return;
  try {
    const data = await api.taxonomy(criteriaFromLayer(layer), createQuery);
    app.taxonomy = phylumClassTree(data);
  } catch {
    app.taxonomy = null;
  }
}

function resultTotal(data) {
  const total = Number(data?.total);
  return Number.isFinite(total) ? total : null;
}

function hasMore(table, pageSize) {
  if (table.data.length < pageSize) return false;
  if (table.total == null) return true;
  return table.pageIndex * pageSize + table.data.length < table.total;
}

export async function nextOccurrences() {
  if (!hasMore(app.dataTable, config.pageSize)) return;
  const last = app.dataTable.data[app.dataTable.data.length - 1];
  app.dataTable.after.push(last?.id ?? null);
  app.dataTable.pageIndex += 1;
  await fetchOccurrences();
}

export async function previousOccurrences() {
  if (app.dataTable.pageIndex === 0) return;
  app.dataTable.after.pop();
  app.dataTable.pageIndex -= 1;
  await fetchOccurrences();
}

export async function nextChecklist() {
  if (!hasMore(app.checklistTable, config.pageSize)) return;
  app.checklistTable.pageIndex += 1;
  app.checklistTable.skip += config.pageSize;
  await fetchChecklist();
}

export async function previousChecklist() {
  if (app.checklistTable.pageIndex === 0) return;
  app.checklistTable.pageIndex -= 1;
  app.checklistTable.skip -= config.pageSize;
  await fetchChecklist();
}

export async function nextDatasets() {
  if (!hasMore(app.datasetTable, config.datasetPageSize)) return;
  app.datasetTable.pageIndex += 1;
  app.datasetTable.skip += config.datasetPageSize;
  await fetchDatasets();
}

export async function previousDatasets() {
  if (app.datasetTable.pageIndex === 0) return;
  app.datasetTable.pageIndex -= 1;
  app.datasetTable.skip -= config.datasetPageSize;
  await fetchDatasets();
}

export function downloadUrl(download) {
  if (download.s3path) return config.s3 + download.s3path;
  return `${config.s3}downloads/${download.id}.zip`;
}

function pollDownload(download) {
  const tick = async () => {
    try {
      const status = await api.downloadStatus(download.id);
      if (status.finished) {
        download.ready = true;
        download.s3path = status.s3path || null;
        clearInterval(download.timer);
        toast("Download finished");
      }
    } catch {
      download.error = true;
      clearInterval(download.timer);
      toast("Download status failed");
    }
  };
  download.timer = setInterval(tick, 2000);
  tick();
}

export async function startDownload(layer) {
  if (!validEmails(app.email)) return;
  if (layer.count > config.maxDownloadRecords) return;
  const criteria = criteriaFromLayer(layer);
  const extensions = [];
  if (app.downloadExtensions.MeasurementOrFact) extensions.push("MeasurementOrFact");
  if (app.downloadExtensions.DNADerivedData) extensions.push("DNADerivedData");
  if (extensions.length) criteria.extensions = extensions.join(",");
  try {
    const email = app.email.trim();
    const response = await api.requestDownload(criteria, email, createQuery);
    app.downloads.push({
      id: response.id,
      criteria,
      email,
      ready: false,
      error: false,
      s3path: null,
      timer: 0,
      startedAt: Date.now(),
    });
    const download = app.downloads[app.downloads.length - 1];
    app.downloadLayerId = null;
    app.view = "downloads";
    toast("Download added");
    pollDownload(download);
  } catch {
    toast("Could not start the download");
  }
}

export async function hydrate() {
  const query = extractQuery(location.href);
  if (!query) return;
  const resolved = await api.resolveQuery(query);
  const { pointsMode, download, ...fields } = resolved;
  const layer = {
    id: nextId++,
    count: null,
    countToken: 0,
    pointsMode: Boolean(pointsMode),
    visible: true,
    ...fields,
    taxa: fields.taxa || [],
    datasets: fields.datasets || [],
    nodes: fields.nodes || [],
    institutes: fields.institutes || [],
    areas: fields.areas || [],
    countries: fields.countries || [],
  };
  app.layers.push(layer);
  refreshCount(layer);
  app.view = download ? "downloads" : "layers";
  if (download) app.downloadLayerId = layer.id;
  replaceUrl(createQuery(criteriaFromLayer(layer)) + (pointsMode ? "&points=true" : ""));
}
