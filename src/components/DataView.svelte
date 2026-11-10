<script>
  import { onMount } from "svelte";
  import TaxonomyTreemap from "./TaxonomyTreemap.svelte";
  import { config } from "../lib/config.js";
  import { formatCoordinate, formatNumber } from "../lib/format.js";
  import {
    app,
    describe,
    nextChecklist,
    nextDatasets,
    nextOccurrences,
    previousChecklist,
    previousDatasets,
    previousOccurrences,
    showMap,
  } from "../lib/state.svelte.js";

  const timelineStart = 1950;

  let section = $state("occurrences");
  let layer = $derived(app.layers.find((item) => item.id === app.selectedLayerId));
  let summary = $derived(layer ? describe(layer).join(" · ") : "");
  let timeline = $derived(buildTimeline(app.graph));
  let maxRecords = $derived(Math.max(...timeline.map((item) => item.records || 0), 1));
  let firstYear = $derived(timeline[0]?.year);
  let lastYear = $derived(timeline[timeline.length - 1]?.year);

  const sections = [
    ["occurrences", "Occurrences"],
    ["checklist", "Checklist"],
    ["datasets", "Datasets"],
  ];

  const occurrenceColumns = [
    { id: "scientificName", fixed: true },
    { id: "dataset", default: true },
    { id: "occurrenceID", default: true },
    { id: "eventDate", fixed: true },
    { id: "decimalLongitude", fixed: true },
    { id: "decimalLatitude", fixed: true },
    { id: "phylum", default: true },
    { id: "class", default: true },
    { id: "order" },
    { id: "family" },
    { id: "genus" },
    { id: "verbatimIdentification" },
    { id: "identificationRemarks" },
    { id: "eventID" },
    { id: "parentEventID" },
    { id: "fieldNumber" },
    { id: "taxonConceptID" },
    { id: "institutionID" },
    { id: "collectionID" },
    { id: "datasetID" },
    { id: "institutionCode" },
    { id: "collectionCode" },
    { id: "catalogNumber" },
    { id: "recordNumber" },
    { id: "materialEntityID" },
    { id: "associatedSequences" },
    { id: "materialSampleID" },
  ];

  let visibleColumns = $state(Object.fromEntries(occurrenceColumns.filter((column) => !column.fixed).map((column) => [column.id, Boolean(column.default)])));
  let activeColumns = $derived(occurrenceColumns.filter((column) => column.fixed || visibleColumns[column.id]));

  function buildTimeline(rows) {
    const counts = new Map();
    for (const item of rows || []) {
      const year = Number(item.year);
      if (Number.isFinite(year)) counts.set(year, item.records || 0);
    }
    if (!counts.size) return [];
    const years = [...counts.keys()];
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const currentYear = new Date().getFullYear();
    const startYear = Math.min(timelineStart, minYear);
    const endYear = Math.max(currentYear, maxYear);
    const bars = [];
    for (let year = startYear; year <= endYear; year++) {
      bars.push({ year, records: counts.get(year) || 0 });
    }
    return bars;
  }

  function plain(value) {
    return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  function pageEnd(table, pageSize) {
    return table.pageIndex * pageSize + table.data.length;
  }

  function canGoNext(table, pageSize) {
    if (!table.data.length || table.data.length < pageSize) return false;
    if (table.total == null) return true;
    return pageEnd(table, pageSize) < table.total;
  }

  function cellText(value) {
    if (value == null || value === "") return "";
    if (Array.isArray(value)) return value.filter((item) => item != null && item !== "").join(", ");
    return String(value);
  }

  onMount(() => {
    const onKey = (event) => {
      if (event.key === "Escape") showMap();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
</script>

<div class="data-modal">
<div class="data-view" role="dialog" aria-modal="true" aria-label="Layer data">
  <header class="data-head">
    <div class="data-top">
      {#if summary}<p class="muted data-summary">{summary}</p>{:else}<span></span>{/if}
      <button type="button" onclick={showMap}>Close</button>
    </div>

    <div class="figures">
      {#if app.statistics}
        <p><strong>{formatNumber(app.statistics.records)}</strong><span>Records</span></p>
        <p><strong>{formatNumber(app.statistics.species)}</strong><span>Species</span></p>
        <p><strong>{formatNumber(app.statistics.taxa)}</strong><span>Taxa</span></p>
        <p>
          <strong>{app.statistics.yearrange ? `${app.statistics.yearrange[0]}–${app.statistics.yearrange[1]}` : "—"}</strong>
          <span>Years</span>
        </p>
      {:else if app.dataLoading}
        <p class="muted">Loading summary…</p>
      {/if}
    </div>

    {#if timeline.length || app.taxonomy || app.dataLoading}
      <div class="charts" class:charts-split={timeline.length > 0 && (app.taxonomy || app.dataLoading)}>
        {#if app.taxonomy}
          <div>
            <TaxonomyTreemap tree={app.taxonomy} />
            <p class="taxonomy-caption">Records by phylum and class.</p>
          </div>
        {:else if app.dataLoading}
          <p class="muted taxonomy-loading">Loading taxonomy…</p>
        {/if}
        {#if timeline.length}
          <div>
            <div class="chart" aria-label="Records by year">
              {#each timeline as bar (bar.year)}
                <div class="bar-wrap" title="{bar.year}: {formatNumber(bar.records)}">
                  <i style:height="{bar.records ? (bar.records / maxRecords) * 100 : 0}%" style:min-height={bar.records ? "1px" : "0"}></i>
                </div>
              {/each}
            </div>
            <div class="chart-years">
              <span>{firstYear}</span>
              <span>{lastYear}</span>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <div class="section-tabs" role="tablist">
      {#each sections as [id, label]}
        <button type="button" role="tab" aria-selected={section === id} class:active={section === id} onclick={() => (section = id)}>{label}</button>
      {/each}
    </div>
  </header>

  <div class="data-scroll">
    {#if section === "occurrences"}
      {@render pager(app.dataTable, config.pageSize, "record", "records", previousOccurrences, nextOccurrences, columnPicker)}
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              {#each activeColumns as column (column.id)}
                <th>{column.id}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each app.dataTable.data as record (record.id)}
              <tr>
                {#each activeColumns as column (column.id)}
                  <td>{@render occurrenceCell(record, column)}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else if section === "checklist"}
      {@render pager(app.checklistTable, config.pageSize, "taxon", "taxa", previousChecklist, nextChecklist)}
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>Scientific name</th><th>Records</th><th>Phylum</th><th>Class</th><th>Order</th><th>Family</th><th>Genus</th></tr>
          </thead>
          <tbody>
            {#each app.checklistTable.data as record, index (`${record.taxonID}-${index}`)}
              <tr>
                <td>
                  {#if record.taxonID}
                    <a href="{config.portal}taxon/{record.taxonID}" target="_blank" rel="noopener noreferrer">{record.scientificName}</a>
                  {:else}
                    {record.scientificName}
                  {/if}
                </td>
                <td>{formatNumber(record.records)}</td>
                <td>{record.phylum || ""}</td>
                <td>{record.class || ""}</td>
                <td>{record.order || ""}</td>
                <td>{record.family || ""}</td>
                <td>{record.genus || ""}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      {@render pager(app.datasetTable, config.datasetPageSize, "dataset", "datasets", previousDatasets, nextDatasets)}
      <ul class="dataset-list">
        {#each app.datasetTable.data as record (record.id)}
          <li>
            <div class="dataset-line">
              <a href="{config.portal}dataset/{record.id}" target="_blank" rel="noopener noreferrer">{record.title || record.id}</a>
              <span>{formatNumber(record.records)} records</span>
            </div>
            {#if record.abstract}<p class="abstract">{plain(record.abstract)}</p>{/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
</div>

{#snippet occurrenceCell(record, column)}
  {#if column.id === "scientificName"}
    <a href="{config.api}occurrence/{record.id}" target="_blank" rel="noopener noreferrer">{record.scientificName || record.id}</a>
  {:else if column.id === "dataset"}
    {#if record.dataset_id}
      <a class="dataset-ref" href="{config.portal}dataset/{record.dataset_id}" target="_blank" rel="noopener noreferrer" title={record.datasetTitle || record.dataset_id}>{record.datasetTitle || record.dataset_id}</a>
    {/if}
  {:else if column.id === "decimalLongitude" || column.id === "decimalLatitude"}
    {formatCoordinate(record[column.id])}
  {:else}
    {cellText(record[column.id])}
  {/if}
{/snippet}

{#snippet columnPicker()}
  <details class="column-picker">
    <summary>Columns</summary>
    <div class="column-menu">
      {#each occurrenceColumns as column (column.id)}
        <label class="check">
          {#if column.fixed}
            <input type="checkbox" checked disabled />
          {:else}
            <input type="checkbox" bind:checked={visibleColumns[column.id]} />
          {/if}
          {column.id}
        </label>
      {/each}
    </div>
  </details>
{/snippet}

{#snippet pager(table, pageSize, singular, plural, previous, next, tools)}
  {@const start = table.data.length ? table.pageIndex * pageSize + 1 : 0}
  {@const end = pageEnd(table, pageSize)}
  <div class="pager">
    <button type="button" disabled={table.pageIndex === 0} onclick={previous}>Previous</button>
    <button type="button" disabled={!canGoNext(table, pageSize)} onclick={next}>Next</button>
    <span class="pager-count">
      {#if table.total == null && !table.data.length}
        Loading…
      {:else if table.total === 0}
        No results
      {:else if table.total == null}
        {formatNumber(start)}–{formatNumber(end)}
      {:else}
        {formatNumber(start)}–{formatNumber(end)} of {formatNumber(table.total)} {table.total === 1 ? singular : plural}
      {/if}
    </span>
    {#if tools}{@render tools()}{/if}
  </div>
{/snippet}
