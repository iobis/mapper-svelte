<script>
  import { config } from "../lib/config.js";
  import { formatNumber, validEmails } from "../lib/format.js";
  import { legendSwatch, schemeFor } from "../lib/palettes.js";
  import { app, describe, loadCriteria, removeLayer, startDownload, togglePoints, viewData } from "../lib/state.svelte.js";

  let editingId = $derived(app.downloadLayerId);
</script>

<div class="panel-head">
  <h2>Layers</h2>
</div>
<div class="panel-body">
  {#if app.layers.length === 0}
    <p class="muted">No layers yet. Add a filter to create one.</p>
  {/if}
  {#each app.layers as layer (layer.id)}
    <article class="card" class:hidden={layer.visible === false}>
      <ul class="lines">
        {#each describe(layer) as line}
          <li>{line}</li>
        {/each}
      </ul>
      <p class="muted">{layer.count == null ? "Counting…" : `${formatNumber(layer.count)} records`}</p>
      <div class="card-bar">
        <div class="chips" title={schemeFor(layer.scale).label}>
          {#each schemeFor(layer.scale).colors as color}<i style:background={legendSwatch(color, Number(layer.opacity))}></i>{/each}
        </div>
        <label class="switch">
          <input
            type="checkbox"
            checked={layer.visible !== false}
            aria-label={layer.visible === false ? "Show layer" : "Hide layer"}
            onchange={(event) => (layer.visible = event.currentTarget.checked)}
          />
          <span></span>
        </label>
      </div>
      <div class="actions">
        <button type="button" onclick={() => togglePoints(layer)}>{layer.pointsMode ? "Grid" : "Points"}</button>
        <button type="button" onclick={() => viewData(layer)}>Data</button>
        <button type="button" onclick={() => loadCriteria(layer)}>Edit</button>
        <button type="button" onclick={() => (app.downloadLayerId = layer.id)}>Download</button>
        <button type="button" onclick={() => removeLayer(layer.id)}>Delete</button>
      </div>
      {#if editingId === layer.id}
        <form class="download-form" onsubmit={(event) => { event.preventDefault(); startDownload(layer); }}>
          {#if layer.count > config.maxDownloadRecords}
            <p class="warning">
              This selection has {formatNumber(layer.count)} records, above the mapper limit of {formatNumber(config.maxDownloadRecords)}.
              Other options are listed at <a href="https://obis.org/data/access/" target="_blank" rel="noopener noreferrer">obis.org/data/access</a>.
            </p>
          {:else}
            <p>Enter an email address. You will be notified when the file is ready. Separate multiple addresses with a semicolon.</p>
            <input type="text" placeholder="Email" bind:value={app.email} />
            <div class="extensions">
              <p>Select extensions to include:</p>
              <label class="check"><input type="checkbox" bind:checked={app.downloadExtensions.MeasurementOrFact} /> MeasurementOrFact</label>
              <label class="check"><input type="checkbox" bind:checked={app.downloadExtensions.DNADerivedData} /> DNADerivedData</label>
              <p class="warning"><strong>Including an extension makes this download much slower.</strong> Preparing the file can take a long time.</p>
            </div>
            <div class="actions">
              <button type="button" onclick={() => (app.downloadLayerId = null)}>Cancel</button>
              <button type="submit" class="primary" disabled={!validEmails(app.email) || layer.count == null}>Start download</button>
            </div>
          {/if}
        </form>
      {/if}
    </article>
  {/each}
</div>
