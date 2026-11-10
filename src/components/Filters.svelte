<script>
  import * as api from "../lib/api.js";
  import { config } from "../lib/config.js";
  import { formatNumber } from "../lib/format.js";
  import { SCHEMES, legendSwatch } from "../lib/palettes.js";
  import { areaTypeLabel } from "../lib/query.js";
  import { app, saveLayer } from "../lib/state.svelte.js";
  import Typeahead from "./Typeahead.svelte";

  const currentYear = new Date().getFullYear();
  let editing = $derived(app.layers.find((layer) => layer.id === app.editLayerId));

  function pushUnique(list, item, key) {
    if (list.some((entry) => entry[key] === item[key])) return;
    list.push(item);
  }

  function setPair(pair, index, value) {
    const next = [...pair];
    next[index] = value === "" ? null : Number(value);
    return next;
  }
</script>

<div class="panel-head">
  <div>
    <h2>Filters</h2>
    {#if editing}
      <p class="muted">{editing.count == null ? "Counting…" : `${formatNumber(editing.count)} records`}</p>
    {/if}
  </div>
  <button type="button" class="primary" onclick={saveLayer} disabled={!editing}>Save layer</button>
</div>

<div class="panel-body">
  <details open>
    <summary>Scientific name</summary>
    <Typeahead
      placeholder="Scientific name"
      search={api.complete}
      label={(item) => item.scientificName}
      detail={(item) => [item.scientificNameAuthorship, item.acceptedNameUsageID].filter(Boolean).join(" · ")}
      onPick={(item) => pushUnique(app.criteria.taxa, {
        scientificName: item.scientificName,
        scientificNameAuthorship: item.scientificNameAuthorship,
        acceptedNameUsageID: item.acceptedNameUsageID,
      }, "acceptedNameUsageID")}
    />
    {#if app.criteria.taxa.length === 0}
      <p class="muted">No taxa selected.</p>
    {:else}
      <ul class="picks">
        {#each app.criteria.taxa as taxon, index (taxon.acceptedNameUsageID)}
          <li>
            <button type="button" onclick={() => app.criteria.taxa.splice(index, 1)}>
              {taxon.scientificName} <small>{taxon.acceptedNameUsageID}</small>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </details>

  <details>
    <summary>Datasets</summary>
    <Typeahead
      placeholder="Dataset title"
      search={api.completeDataset}
      label={(item) => item.title}
      detail={(item) => item.id}
      onPick={(item) => pushUnique(app.criteria.datasets, { id: item.id, title: item.title }, "id")}
    />
    {@render picks(app.criteria.datasets, "No datasets selected.", (item) => item.title, (item) => item.id, (index) => app.criteria.datasets.splice(index, 1))}
  </details>

  <details>
    <summary>Nodes</summary>
    <Typeahead
      placeholder="Node name"
      search={api.completeNode}
      label={(item) => item.name}
      detail={(item) => item.id}
      onPick={(item) => pushUnique(app.criteria.nodes, { id: item.id, name: item.name }, "id")}
    />
    {@render picks(app.criteria.nodes, "No nodes selected.", (item) => item.name, (item) => item.id, (index) => app.criteria.nodes.splice(index, 1))}
  </details>

  <details>
    <summary>Institutes</summary>
    <Typeahead
      placeholder="Institute name"
      search={api.completeInstitute}
      label={(item) => item.name}
      detail={(item) => item.id}
      onPick={(item) => pushUnique(app.criteria.institutes, { id: item.id, name: item.name }, "id")}
    />
    {@render picks(app.criteria.institutes, "No institutes selected.", (item) => item.name, (item) => item.id, (index) => app.criteria.institutes.splice(index, 1))}
  </details>

  <details>
    <summary>Areas</summary>
    <Typeahead
      placeholder="Area name"
      search={api.completeArea}
      label={(item) => item.name}
      detail={(item) => `${item.id}${areaTypeLabel(item.type) ? ` (${areaTypeLabel(item.type)})` : ""}`}
      onPick={(item) => pushUnique(app.criteria.areas, { id: item.id, name: item.name, type: item.type }, "id")}
    />
    {@render picks(app.criteria.areas, "No areas selected.", (item) => item.name, (item) => `${item.id}${areaTypeLabel(item.type) ? ` (${areaTypeLabel(item.type)})` : ""}`, (index) => app.criteria.areas.splice(index, 1))}
  </details>

  <details>
    <summary>Publisher countries</summary>
    <Typeahead
      placeholder="Country"
      search={api.completeCountry}
      label={(item) => item.country}
      detail={(item) => item.id}
      onPick={(item) => pushUnique(app.criteria.countries, { id: item.id, country: item.country }, "id")}
    />
    {@render picks(app.criteria.countries, "No countries selected.", (item) => item.country, (item) => item.id, (index) => app.criteria.countries.splice(index, 1))}
  </details>

  <details>
    <summary>Geometry</summary>
    {#if app.criteria.wkt}
      <p class="wkt">{app.criteria.wkt}</p>
      <button type="button" onclick={() => (app.criteria.wkt = null)}>Clear polygon</button>
    {:else}
      <p class="muted">No polygon selected.</p>
    {/if}
    <button type="button" class:primary={app.drawing} onclick={() => (app.drawing = !app.drawing)}>
      {app.drawing ? "Cancel drawing" : "Draw polygon"}
    </button>
  </details>

  <details>
    <summary>Time range</summary>
    <div class="pair">
      <label>From
        <input type="number" min={config.startYear} max={currentYear} value={app.criteria.timeValues[0] ?? ""} onchange={(event) => (app.criteria.timeValues = setPair(app.criteria.timeValues, 0, event.currentTarget.value))} />
      </label>
      <label>To
        <input type="number" min={config.startYear} max={currentYear} value={app.criteria.timeValues[1] ?? ""} onchange={(event) => (app.criteria.timeValues = setPair(app.criteria.timeValues, 1, event.currentTarget.value))} />
      </label>
    </div>
  </details>

  <details>
    <summary>Depth range</summary>
    <div class="pair">
      <label>From (m)
        <input type="number" min="0" max="11000" value={app.criteria.depthValues[0] ?? ""} onchange={(event) => (app.criteria.depthValues = setPair(app.criteria.depthValues, 0, event.currentTarget.value))} />
      </label>
      <label>To (m)
        <input type="number" min="0" max="11000" value={app.criteria.depthValues[1] ?? ""} onchange={(event) => (app.criteria.depthValues = setPair(app.criteria.depthValues, 1, event.currentTarget.value))} />
      </label>
    </div>
  </details>

  <details>
    <summary>Extensions</summary>
    <label class="check"><input type="checkbox" bind:checked={app.criteria.hasextensions.MeasurementOrFact} /> MeasurementOrFact</label>
    <label class="check"><input type="checkbox" bind:checked={app.criteria.hasextensions.DNADerivedData} /> DNADerivedData</label>
  </details>

  <details>
    <summary>Records</summary>
    <label>Dropped
      <select bind:value={app.criteria.dropped}>
        <option value="">Exclude dropped</option>
        <option value="true">Only dropped</option>
        <option value="include">Include dropped</option>
      </select>
    </label>
    <label>Absence
      <select bind:value={app.criteria.absence}>
        <option value="">Exclude absence</option>
        <option value="true">Only absence</option>
        <option value="include">Include absence</option>
      </select>
    </label>
    <label class="check"><input type="checkbox" bind:checked={app.criteria.redlist} /> Only Red List species</label>
    <label class="check"><input type="checkbox" bind:checked={app.criteria.hab} /> Only HAB species</label>
    <label class="check"><input type="checkbox" bind:checked={app.criteria.excludeEdna} /> Exclude eDNA</label>
    <label class="check"><input type="checkbox" bind:checked={app.criteria.excludeCitizenScience} /> Exclude citizen science</label>
  </details>

  <details open>
    <summary>Colour</summary>
    <div class="schemes">
      {#each Object.entries(SCHEMES) as [id, scheme]}
        <label class="scheme">
          <input type="radio" name="scheme" value={id} bind:group={app.criteria.scale} />
          <span>{scheme.label}</span>
          <span class="chips">
            {#each scheme.colors as color}<i style:background={legendSwatch(color, Number(app.criteria.opacity))}></i>{/each}
          </span>
        </label>
      {/each}
    </div>
    <div class="opacity">
      <div class="opacity-head">
        <span>Opacity</span>
        <span>{Math.round(app.criteria.opacity * 100)}%</span>
      </div>
      <input
        class="opacity-slider"
        type="range"
        min="0.1"
        max="1"
        step="0.05"
        value={app.criteria.opacity}
        style:--slider-progress={`${((Number(app.criteria.opacity) - 0.1) / 0.9) * 100}%`}
        aria-label="Opacity"
        oninput={(event) => (app.criteria.opacity = Number(event.currentTarget.value))}
      />
    </div>
    <label class="check"><input type="checkbox" bind:checked={app.criteria.showLabels} /> Show record counts</label>
  </details>
</div>

{#snippet picks(items, empty, label, meta, remove)}
  {#if items.length === 0}
    <p class="muted">{empty}</p>
  {:else}
    <ul class="picks">
      {#each items as item, index (`${meta(item)}-${index}`)}
        <li><button type="button" onclick={() => remove(index)}>{label(item)} <small>{meta(item)}</small></button></li>
      {/each}
    </ul>
  {/if}
{/snippet}
