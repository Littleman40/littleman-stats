<script>
  let {                                  // local variables
    tally: tallyMap = {} 
  } = $props();

  const sortedEntries = $derived(
    Object.entries(tallyMap)             // converts the { name: count } object into an array of [name, count] pairs
      .sort(([, a], [, b]) => b - a)     // sorts highest count first
  );
</script>

{#if sortedEntries.length}
  <ul class="tally-list">
    {#each sortedEntries as [tallyName, tallyCount]}
      <li class="tally-row">
        <span class="name">{tallyName}</span>
        <span class="count">{tallyCount}</span>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .tally-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .tally-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.45rem 0.75rem;
    border-radius: 0.4rem;
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
  }

  .name {
    font-size: 0.875rem;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 75%;
  }

  .count {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-muted);
    flex-shrink: 0;
  }
</style>
