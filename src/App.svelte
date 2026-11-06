<script>
  import { onMount, untrack } from "svelte";
  import DataView from "./components/DataView.svelte";
  import MapView from "./components/MapView.svelte";
  import Sidebar from "./components/Sidebar.svelte";
  import { app, applyCriteria, criteriaKey, hydrate, toast } from "./lib/state.svelte.js";

  let booted = $state(false);

  $effect(() => {
    criteriaKey(app.criteria);
    if (!booted) return;
    // Layer writes must not retrigger this effect, or each taxon pick loops for several seconds.
    untrack(() => applyCriteria());
  });

  onMount(async () => {
    try {
      await hydrate();
    } catch (error) {
      console.error(error);
      toast("Could not open this link");
    }
    booted = true;
  });
</script>

<div class="shell">
  <MapView />
  {#if app.mapMode}
    <Sidebar ready={booted} />
  {:else}
    <DataView />
  {/if}
  {#if app.toast}
    <p class="toast" role="status">{app.toast}</p>
  {/if}
</div>
