<script>
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

  let section = $state("occurrences");
  let layer = $derived(app.layers.find((item) => item.id === app.selectedLayerId));
  let summary = $derived(layer ? describe(layer).join(" · ") : "");
  let maxRecords = $derived(Math.max(...app.graph.map((item) => item.records || 0), 1));
  let firstYear = $derived(app.graph[0]?.year);
  let lastYear = $derived(app.graph[app.graph.length - 1]?.year);

  const sections = [
    ["occurrences", "Occurrences"],
    ["checklist", "Checklist"],
    ["datasets", "Datasets"],
  ];

  function plain(value) {
    return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
</script>

<div class="data-view">
  <header class="data-head">
    <div class="data-top">
      <button type="button" onclick={showMap}>Back to map</button>
      {#if summary}<p class="muted data-summary">{summary}</p>{/if}
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

    {#if app.graph.length}
      <div class="chart" aria-label="Records by year">
        {#each app.graph as bar}
          <div class="bar-wrap" title="{bar.year}: {formatNumber(bar.records)}">
            <i style:height="{(bar.records / maxRecords) * 100}%"></i>
          </div>
        {/each}
      </div>
      <div class="chart-years">
        <span>{firstYear}</span>
        <span>{lastYear}</span>
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
      <div class="pager">
        <button type="button" disabled={app.dataTable.pageIndex === 0} onclick={previousOccurrences}>Previous</button>
        <span>{app.dataTable.pageIndex + 1}</span>
        <button type="button" disabled={app.dataTable.data.length < config.pageSize} onclick={nextOccurrences}>Next</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>Scientific name</th><th>Event date</th><th>Longitude</th><th>Latitude</th><th>Institution</th><th>Dataset</th></tr>
          </thead>
          <tbody>
            {#each app.dataTable.data as record (record.id)}
              <tr>
                <td><a href="{config.api}occurrence/{record.id}" target="_blank" rel="noopener noreferrer">{record.scientificName || record.id}</a></td>
                <td>{record.eventDate || ""}</td>
                <td>{formatCoordinate(record.decimalLongitude)}</td>
                <td>{formatCoordinate(record.decimalLatitude)}</td>
                <td>{record.institutionCode || ""}</td>
                <td>
                  {#if record.dataset_id}
                    <a class="dataset-ref" href="{config.portal}dataset/{record.dataset_id}" target="_blank" rel="noopener noreferrer" title={record.datasetTitle || record.dataset_id}>{record.datasetTitle || record.dataset_id}</a>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else if section === "checklist"}
      <div class="pager">
        <button type="button" disabled={app.checklistTable.pageIndex === 0} onclick={previousChecklist}>Previous</button>
        <span>{app.checklistTable.pageIndex + 1}</span>
        <button type="button" disabled={app.checklistTable.data.length < config.pageSize} onclick={nextChecklist}>Next</button>
      </div>
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
      <div class="pager">
        <button type="button" disabled={app.datasetTable.pageIndex === 0} onclick={previousDatasets}>Previous</button>
        <span>{app.datasetTable.pageIndex + 1}</span>
        <button type="button" disabled={app.datasetTable.data.length < config.datasetPageSize} onclick={nextDatasets}>Next</button>
      </div>
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
