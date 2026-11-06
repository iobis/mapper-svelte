<script>
  import { app, describe, downloadUrl, toast } from "../lib/state.svelte.js";

  let now = $state(Date.now());

  $effect(() => {
    if (!app.downloads.some((item) => !item.ready && !item.error)) return;
    const timer = setInterval(() => {
      now = Date.now();
    }, 1000);
    return () => clearInterval(timer);
  });

  function runningTime(startedAt) {
    const total = Math.max(0, Math.floor((now - startedAt) / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = String(total % 60).padStart(2, "0");
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`;
    return `${minutes}:${seconds}`;
  }

  async function copy(download) {
    try {
      await navigator.clipboard.writeText(downloadUrl(download));
      toast("File URL copied");
    } catch {
      toast("Could not copy the URL");
    }
  }
</script>

<div class="panel-head">
  <h2>Downloads</h2>
</div>
<div class="panel-body">
  {#if app.downloads.length === 0}
    <p class="muted">No downloads yet.</p>
  {/if}
  {#each app.downloads as download (download.id)}
    <article class="card">
      <ul class="lines">
        {#each describe(download.criteria) as line}
          <li>{line}</li>
        {/each}
      </ul>
      {#if download.ready}
        <div class="actions">
          <a class="button primary" href={downloadUrl(download)} target="_blank" rel="noopener noreferrer">Download ZIP</a>
          <button type="button" onclick={() => copy(download)}>Copy link</button>
        </div>
      {:else if download.error}
        <p class="warning">This download could not be prepared.</p>
      {:else}
        <p class="preparing">Preparing file… <span class="elapsed">{runningTime(download.startedAt)}</span></p>
        <p class="muted">A notification will be sent to {download.email} when the download is ready.</p>
      {/if}
    </article>
  {/each}
</div>
