<script>
  let { tally = {} } = $props();

  const entries = $derived(
    Object.entries(tally)
      .sort(([, a], [, b]) => b - a)
  );

  const maxCount = $derived(entries.length ? entries[0][1] : 1);
</script>

{#if entries.length}
  <ul class="tally-list">
    {#each entries as [name, count]}
      {@const pct = (count / maxCount) * 100}
      <li class="tally-row">
        <div class="bar" style="width: {pct}%"></div>
        <span class="name">{name}</span>
        <span class="count">{count}</span>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .tally-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .tally-row {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.45rem 0.75rem;
    border-radius: 4px;
    overflow: hidden;
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
  }

  .bar {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.06);
    pointer-events: none;
  }

  .name {
    position: relative;
    font-size: 0.875rem;
    color: var(--color-text);
    z-index: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 75%;
  }

  .count {
    position: relative;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-muted);
    z-index: 1;
    flex-shrink: 0;
  }
</style>
