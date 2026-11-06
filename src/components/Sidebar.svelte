<script>
  import { app } from "../lib/state.svelte.js";
  import Filters from "./Filters.svelte";
  import Layers from "./Layers.svelte";
  import Downloads from "./Downloads.svelte";

  let { ready = true } = $props();

  const tabs = [
    ["layers", "Layers"],
    ["filters", "Filters"],
    ["downloads", "Downloads"],
  ];
</script>

<aside class="sidebar">
  <a class="brand" href={import.meta.env.BASE_URL}>OBIS Mapper</a>
  <div class="tabs">
    {#each tabs as [id, label]}
      <button type="button" class:active={app.view === id} onclick={() => (app.view = id)}>{label}</button>
    {/each}
  </div>
  {#if ready}
    {#if app.view === "layers"}<Layers />
    {:else if app.view === "downloads"}<Downloads />
    {:else}<Filters />
    {/if}
  {:else}
    <p class="muted loading">Loading…</p>
  {/if}
</aside>
