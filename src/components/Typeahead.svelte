<script>
  let { placeholder, search, label, detail, onPick } = $props();
  let text = $state("");
  let items = $state([]);
  let open = $state(false);
  let timer = 0;

  function onInput(event) {
    text = event.currentTarget.value;
    clearTimeout(timer);
    const query = text.trim();
    if (query.length < 2) {
      items = [];
      open = false;
      return;
    }
    timer = setTimeout(async () => {
      try {
        const result = await search(query);
        items = Array.isArray(result) ? result : [];
        open = items.length > 0;
      } catch {
        items = [];
        open = false;
      }
    }, 300);
  }

  function pick(item) {
    onPick(item);
    text = "";
    items = [];
    open = false;
  }
</script>

<div class="typeahead">
  <input type="text" value={text} {placeholder} autocomplete="off" oninput={onInput} onfocus={() => (open = items.length > 0)} />
  {#if open}
    <ul>
      {#each items as item, index (`${label(item)}-${index}`)}
        <li>
          <button type="button" onmousedown={(event) => event.preventDefault()} onclick={() => pick(item)}>
            <span>{label(item)}</span>
            {#if detail(item)}<small>{detail(item)}</small>{/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
