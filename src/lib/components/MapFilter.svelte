<script>
  import { MAP_OPTIONS } from '$lib/utils/maps.js';

  // local variables - shared by the leaderboard filter bar and the ranks page
  let {
    activeMap = 'srp',
    onmapchange
  } = $props();
</script>

<div class="group">
  <span class="group-label">Map:</span>
  <div class="pills">

    <!-- list every map - clicking one swaps to that map's leaderboard -->
    {#each MAP_OPTIONS as mapOption}

      <button
        class="pill"
        class:active={activeMap === mapOption.slug}
        onclick={() => onmapchange?.(mapOption.slug)}
      >{mapOption.label}</button>

    {/each}

  </div>
</div>

<style>
  .group {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem 0.7rem;
    max-width: 100%;
    padding: 0.4rem;
    padding-left: 0.9rem;
    border: 1px solid var(--color-border);
    border-radius: 1.5rem;
    background: var(--color-card-elevated);
  }

  .group-label {
    font-size: 0.75rem;
    font-weight: 1000;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--color-muted);
    white-space: nowrap;
  }

  .pills {
    display: contents;
  }

  .pill {
    padding: 0.35rem 0.85rem;
    border-radius: var(--radius-pill);
    border: 1px solid var(--color-border);
    background: var(--color-card-elevated);
    color: var(--color-muted);
    font-size: 0.85rem;
    font-family: inherit;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }

  .pill:hover {
    border-color: #555555;
    color: var(--color-text);
  }

  .pill.active {
    background: var(--color-text);
    color: var(--color-text-on-light);
    border-color: var(--color-text);
  }
</style>
