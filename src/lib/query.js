const AREA_TYPES = {
  iho: "IHO",
  lme: "LME",
  ebsa: "EBSA",
  mwhs: "World Heritage",
};

const EDNA_DATASET_TAG = "https://rs.obis.org/obis/vocabulary/DatasetType/EnvironmentalDna";
const CITIZEN_SCIENCE_DATASET_TAG = "https://rs.obis.org/obis/vocabulary/DatasetType/CitizenScience";

function excludeTags(criteria) {
  const tags = [];
  if (criteria.excludeEdna) tags.push(EDNA_DATASET_TAG);
  if (criteria.excludeCitizenScience) tags.push(CITIZEN_SCIENCE_DATASET_TAG);
  return tags;
}

function hasExcludeTag(value, tag) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .includes(tag);
}

export function areaTypeLabel(type) {
  if (!type) return "";
  return AREA_TYPES[String(type).toLowerCase()] || "";
}

function add(pairs, key, value) {
  if (value == null || value === "" || value === false) return;
  pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
}

export function createQuery(criteria) {
  const pairs = [];
  add(pairs, "size", criteria.size);
  add(pairs, "skip", criteria.skip);
  if (criteria.after != null && criteria.after > " ") add(pairs, "after", criteria.after);
  add(pairs, "dropped", criteria.dropped);
  add(pairs, "absence", criteria.absence);
  if (criteria.redlist) add(pairs, "redlist", true);
  if (criteria.hab) add(pairs, "hab", true);
  if (criteria.taxa?.length) {
    add(pairs, "taxonid", criteria.taxa.filter(Boolean).map((taxon) => taxon.acceptedNameUsageID).join(","));
  }
  if (criteria.datasets?.length) add(pairs, "datasetid", criteria.datasets.map((item) => item.id).join(","));
  if (criteria.nodes?.length) add(pairs, "nodeid", criteria.nodes.map((item) => item.id).join(","));
  if (criteria.institutes?.length) add(pairs, "instituteid", criteria.institutes.map((item) => item.id).join(","));
  if (criteria.areas?.length) add(pairs, "areaid", criteria.areas.map((item) => item.id).join(","));
  if (criteria.countries?.length) add(pairs, "countryid", criteria.countries.map((item) => item.id).join(","));
  if (criteria.startyear) add(pairs, "startdate", `${criteria.startyear}-01-01`);
  if (criteria.endyear) add(pairs, "enddate", `${criteria.endyear}-12-31`);
  if (!criteria.startyear && criteria.startdate) add(pairs, "startdate", criteria.startdate);
  if (!criteria.endyear && criteria.enddate) add(pairs, "enddate", criteria.enddate);
  add(pairs, "startdepth", criteria.startdepth);
  add(pairs, "enddepth", criteria.enddepth);
  add(pairs, "geometry", criteria.geometry);
  add(pairs, "flags", criteria.flags);
  add(pairs, "exclude", criteria.exclude);
  const tags = excludeTags(criteria);
  if (tags.length) add(pairs, "exclude_tags", tags.join(","));
  add(pairs, "extensions", criteria.extensions);
  if (criteria.hasextensions) {
    const names = Object.keys(criteria.hasextensions).filter((key) => criteria.hasextensions[key]);
    if (names.length) add(pairs, "hasextensions", names.join(","));
  }
  return pairs.join("&");
}

export function criteriaFromLayer(layer) {
  return {
    taxa: layer.taxa,
    datasets: layer.datasets,
    nodes: layer.nodes,
    institutes: layer.institutes,
    areas: layer.areas,
    countries: layer.countries,
    startyear: layer.startyear,
    endyear: layer.endyear,
    startdepth: layer.startdepth,
    enddepth: layer.enddepth,
    geometry: layer.geometry,
    dropped: layer.dropped,
    absence: layer.absence,
    redlist: layer.redlist,
    hab: layer.hab,
    excludeEdna: layer.excludeEdna,
    excludeCitizenScience: layer.excludeCitizenScience,
    flags: layer.flags,
    exclude: layer.exclude,
    hasextensions: layer.hasextensions,
  };
}

function splitList(params, key) {
  if (params[key]) params[key] = params[key].split(",").filter(Boolean);
}

export function extractQuery(url) {
  const parts = url.split("?");
  if (parts.length < 2 || !parts[1]) return null;
  const params = {};
  for (const piece of parts[1].split("&")) {
    if (!piece) continue;
    const index = piece.indexOf("=");
    const key = decodeURIComponent(index === -1 ? piece : piece.slice(0, index));
    const raw = index === -1 ? "" : piece.slice(index + 1);
    params[key] = decodeURIComponent(raw.replace(/\+/g, " "));
  }
  if (!Object.keys(params).length) return null;
  for (const key of ["taxonid", "datasetid", "instituteid", "nodeid", "areaid", "countryid"]) {
    splitList(params, key);
  }
  if (params.hasextensions) {
    const extensions = { MeasurementOrFact: false, DNADerivedData: false };
    for (const name of params.hasextensions.split(",")) extensions[name] = true;
    params.hasextensions = extensions;
  }
  return params;
}

export function hasFilters(criteria) {
  const extensions = criteria.hasextensions && Object.values(criteria.hasextensions).some(Boolean);
  return Boolean(
    extensions ||
      criteria.hab ||
      criteria.redlist ||
      criteria.excludeEdna ||
      criteria.excludeCitizenScience ||
      criteria.dropped ||
      criteria.absence ||
      criteria.taxa?.length ||
      criteria.datasets?.length ||
      criteria.nodes?.length ||
      criteria.institutes?.length ||
      criteria.areas?.length ||
      criteria.countries?.length ||
      criteria.wkt ||
      criteria.geometry ||
      criteria.timeValues?.some((value) => value != null) ||
      criteria.depthValues?.some((value) => value != null) ||
      criteria.startyear ||
      criteria.endyear ||
      criteria.startdepth ||
      criteria.enddepth ||
      criteria.flags ||
      criteria.exclude
  );
}

export function criteriaKey(criteria) {
  return JSON.stringify([
    criteria.taxa?.map((item) => item.acceptedNameUsageID),
    criteria.datasets?.map((item) => item.id),
    criteria.nodes?.map((item) => item.id),
    criteria.institutes?.map((item) => item.id),
    criteria.areas?.map((item) => item.id),
    criteria.countries?.map((item) => item.id),
    criteria.timeValues?.[0],
    criteria.timeValues?.[1],
    criteria.depthValues?.[0],
    criteria.depthValues?.[1],
    criteria.scale,
    criteria.opacity,
    criteria.showLabels,
    criteria.wkt,
    criteria.dropped,
    criteria.absence,
    criteria.redlist,
    criteria.hab,
    criteria.excludeEdna,
    criteria.excludeCitizenScience,
    criteria.flags,
    criteria.exclude,
    criteria.hasextensions?.MeasurementOrFact,
    criteria.hasextensions?.DNADerivedData,
  ]);
}

function triState(value) {
  if (value === true || value === "true") return "true";
  if (value === "include") return "include";
  return "";
}

function yearOf(value) {
  if (!value) return null;
  const year = Number(String(value).slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

export function layerFieldsFromCriteria(criteria) {
  return {
    taxa: criteria.taxa.map((item) => ({ ...item })),
    datasets: criteria.datasets.map((item) => ({ ...item })),
    nodes: criteria.nodes.map((item) => ({ ...item })),
    institutes: criteria.institutes.map((item) => ({ ...item })),
    areas: criteria.areas.map((item) => ({ ...item })),
    countries: criteria.countries.map((item) => ({ ...item })),
    startyear: criteria.timeValues[0],
    endyear: criteria.timeValues[1],
    startdepth: criteria.depthValues[0],
    enddepth: criteria.depthValues[1],
    geometry: criteria.wkt,
    dropped: triState(criteria.dropped),
    absence: triState(criteria.absence),
    redlist: Boolean(criteria.redlist),
    hab: Boolean(criteria.hab),
    excludeEdna: Boolean(criteria.excludeEdna),
    excludeCitizenScience: Boolean(criteria.excludeCitizenScience),
    flags: criteria.flags || null,
    exclude: criteria.exclude || null,
    hasextensions: {
      MeasurementOrFact: Boolean(criteria.hasextensions?.MeasurementOrFact),
      DNADerivedData: Boolean(criteria.hasextensions?.DNADerivedData),
    },
    scale: criteria.scale || "hawaii",
    opacity: Number(criteria.opacity ?? 0.4),
    showLabels: Boolean(criteria.showLabels),
  };
}

export function blankFromQuery(query) {
  return {
    startyear: yearOf(query.startdate),
    endyear: yearOf(query.enddate),
    startdepth: query.startdepth ? Number(query.startdepth) : null,
    enddepth: query.enddepth ? Number(query.enddepth) : null,
    geometry: query.geometry || null,
    dropped: triState(query.dropped),
    absence: triState(query.absence),
    redlist: query.redlist === "true" || query.redlist === true,
    hab: query.hab === "true" || query.hab === true,
    excludeEdna: hasExcludeTag(query.exclude_tags, EDNA_DATASET_TAG),
    excludeCitizenScience: hasExcludeTag(query.exclude_tags, CITIZEN_SCIENCE_DATASET_TAG),
    flags: query.flags || null,
    exclude: query.exclude || null,
    hasextensions: query.hasextensions || { MeasurementOrFact: false, DNADerivedData: false },
    scale: "hawaii",
    opacity: 0.4,
    showLabels: false,
    pointsMode: query.points === "true" || query.points === true || query.points === "1",
    download: query.download != null && query.download !== "false" && query.download !== "0",
  };
}

export function describe(layer) {
  const lines = [];
  for (const taxon of layer.taxa || []) {
    lines.push([taxon.scientificName, taxon.scientificNameAuthorship].filter(Boolean).join(" "));
  }
  for (const dataset of layer.datasets || []) lines.push(`Dataset ${dataset.id}${dataset.title ? ` · ${dataset.title}` : ""}`);
  for (const node of layer.nodes || []) lines.push(`Node ${node.id}${node.name ? ` · ${node.name}` : ""}`);
  for (const institute of layer.institutes || []) lines.push(`Institute ${institute.id}${institute.name ? ` · ${institute.name}` : ""}`);
  for (const area of layer.areas || []) {
    const type = areaTypeLabel(area.type);
    lines.push(`Area ${area.id}${area.name ? ` · ${area.name}` : ""}${type ? ` (${type})` : ""}`);
  }
  for (const country of layer.countries || []) lines.push(`Country ${country.id}${country.country ? ` · ${country.country}` : ""}`);
  if (layer.hasextensions?.MeasurementOrFact) lines.push("Extension MeasurementOrFact");
  if (layer.hasextensions?.DNADerivedData) lines.push("Extension DNADerivedData");
  if (layer.startyear || layer.endyear) lines.push(`${layer.startyear ?? "…"} → ${layer.endyear ?? "…"}`);
  if (layer.startdepth || layer.enddepth) lines.push(`${layer.startdepth ?? "…"} → ${layer.enddepth ?? "…"} m`);
  if (layer.geometry) lines.push("Polygon filter set");
  if (layer.dropped === "true") lines.push("Only dropped records");
  if (layer.dropped === "include") lines.push("Dropped records included");
  if (layer.absence === "true") lines.push("Only absence records");
  if (layer.absence === "include") lines.push("Absence records included");
  if (layer.redlist) lines.push("Only Red List species");
  if (layer.hab) lines.push("Only HAB species");
  if (layer.excludeEdna) lines.push("Exclude eDNA");
  if (layer.excludeCitizenScience) lines.push("Exclude citizen science");
  if (layer.flags) lines.push(`Flags: ${layer.flags}`);
  if (layer.exclude) lines.push(`Exclude: ${layer.exclude}`);
  return lines;
}

export function polygonToWkt(ring) {
  if (!ring?.length) return null;
  const closed = ring.map(([lng, lat]) => [Number(lng), Number(lat)]);
  const first = closed[0];
  const last = closed[closed.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) closed.push(first);
  const points = closed.map(([lng, lat]) => `${lng.toFixed(4)} ${lat.toFixed(4)}`);
  return `POLYGON ((${points.join(", ")}))`;
}

export function wktToPolygon(wkt) {
  if (!wkt) return null;
  const match = String(wkt).match(/POLYGON\s*\(\((.+)\)\)/i);
  if (!match) return null;
  const ring = match[1].split(",").map((pair) => {
    const [lng, lat] = pair.trim().split(/\s+/).map(Number);
    return [lng, lat];
  });
  if (ring.length < 4 || ring.some((coord) => !Number.isFinite(coord[0]) || !Number.isFinite(coord[1]))) return null;
  return { type: "Polygon", coordinates: [ring] };
}
