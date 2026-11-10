<script>
  import { formatNumber } from "../lib/format.js";
  import { layoutTreemap } from "../lib/treemap.js";

  let { tree } = $props();

  const header = 20;

  let host = $state(null);
  let width = $state(0);
  let height = $state(0);
  let tip = $state(null);

  let nodes = $derived(layoutTreemap(tree, width, height));

  $effect(() => {
    const node = host;
    if (!node) return;
    const measure = () => {
      width = node.clientWidth;
      height = node.clientHeight;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  });

  function truncate(node, params) {
    const apply = ({ text, width: available }) => {
      if (!text || available < 28) {
        node.textContent = "";
        return;
      }
      let label = text;
      node.textContent = label;
      const length = () => (typeof node.getComputedTextLength === "function" ? node.getComputedTextLength() : label.length * 6);
      while (label.length > 3 && length() > available) {
        label = label.slice(0, -1);
        node.textContent = `${label}…`;
      }
    };
    apply(params);
    return { update: apply };
  }

  function recordsLabel(count) {
    return count === 1 ? "1 record" : `${formatNumber(count)} records`;
  }

  function showTip(event, text) {
    tip = {
      x: Math.min(event.clientX + 12, window.innerWidth - 220),
      y: Math.min(event.clientY + 12, window.innerHeight - 36),
      text,
    };
  }

  function fitsLabel(cell) {
    return cell.width >= 36 && cell.height >= 14;
  }
</script>

<div class="taxonomy-chart" bind:this={host} role="img" aria-label="Records by phylum and class">
  {#if width >= 40 && height >= 40}
    <svg width={width} height={height} viewBox="0 0 {width} {height}">
      {#each nodes as phylum (phylum.name)}
        <rect
          x={phylum.x}
          y={phylum.y}
          width={phylum.width}
          height={header}
          fill={phylum.color}
          fill-opacity="0.6"
          role="img"
          aria-label="{phylum.name} — {recordsLabel(phylum.value)}"
          onmousemove={(event) => showTip(event, `${phylum.name} — ${recordsLabel(phylum.value)}`)}
          onmouseleave={() => (tip = null)}
        />
        <text class="taxonomy-phylum-label" x={phylum.x + 4} y={phylum.y + 14} use:truncate={{ text: phylum.name, width: phylum.width - 8 }}></text>
        {#each phylum.classes as cell (`${phylum.name}:${cell.name}`)}
          <rect
            x={cell.x}
            y={cell.y}
            width={cell.width}
            height={cell.height}
            fill={phylum.color}
            fill-opacity="0.6"
            role="img"
            aria-label="{cell.phylum} · {cell.name} — {recordsLabel(cell.value)}"
            onmousemove={(event) => showTip(event, `${cell.phylum} · ${cell.name} — ${recordsLabel(cell.value)}`)}
            onmouseleave={() => (tip = null)}
          />
          {#if fitsLabel(cell)}
            <text class="taxonomy-class-label">
              <tspan x={cell.x + 4} y={cell.y + 13} use:truncate={{ text: cell.name, width: cell.width - 8 }}></tspan>
              {#if cell.height >= 28}
                <tspan class="taxonomy-class-value" x={cell.x + 4} dy="1.1em">{formatNumber(cell.value)}</tspan>
              {/if}
            </text>
          {/if}
        {/each}
      {/each}
    </svg>
  {/if}
</div>

{#if tip}
  <div class="taxonomy-tooltip" style:left="{tip.x}px" style:top="{tip.y}px">{tip.text}</div>
{/if}
