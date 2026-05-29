<script>
  let {                                             // local variables
    activeFilter = 'all',
    activeView = 'leaderboard',
    onfilterchange,
    onviewchange,
    onreset
  } = $props();

  const filters = [                                  // filter types
    { value: 'all', label: 'Everything' },
    { value: 'crew', label: 'Crew' },
    { value: 'solo', label: 'Solo' },
    { value: 'realistic', label: 'Realistic Physics (Solo)' }
  ];

  const views = [                                    // different view modes
    { value: 'leaderboard', label: 'Leaderboard' },
    { value: 'statistics', label: 'Statistics' }
  ];
</script>

<div class="filter-bar">
  <div class="group">
    <span class="group-label">Filter By:</span>
    <div class="pills">
      {#each filters as filterobj}                <!-- list all filters - when button is clicked, we change filter to that value -->
        <button
          class="pill"
          class:active={activeFilter === filterobj.value}
          onclick={() => onfilterchange?.(filterobj.value)}
        >{filterobj.label}</button>
      {/each}
    </div>
  </div>

  <div class="group">
    <span class="group-label">View:</span>
    <div class="pills">
      {#each views as viewobj}                      <!-- list all view buttons -->
        <button
        class="pill"
        class:active={activeView === viewobj.value}
        onclick={() => onviewchange?.(viewobj.value)}>
          {viewobj.label}
        </button>
      {/each}
    </div>
  </div>

  <button class="reset-btn" onclick={() => onreset?.()} aria-label="Reset filters">   
    <img src="/img/cross.svg" width="14" height="14" alt="" style="filter: invert(1)" />
  </button>
</div>

<style>
  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }

  .group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: nowrap;
    flex-shrink: 0;
    padding: 0.3rem;
    padding-left: 0.9rem;
    border: 1px solid var(--color-border);
    border-radius: 3rem;
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
    display: flex;
    gap: 0.5rem;
    flex-wrap: nowrap;
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

  .reset-btn {
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 999rem;
    border: 1px solid var(--color-border);
    background: var(--color-card-elevated);
    color: var(--color-muted);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
    flex-shrink: 0;
  }

  .reset-btn:hover {
    border-color: #555555;
    color: var(--color-text);
  }
</style>
