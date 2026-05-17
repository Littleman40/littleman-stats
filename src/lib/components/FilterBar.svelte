<script>
  let {
    activeFilter = 'all',
    activeView = 'leaderboard',
    onfilterchange,
    onviewchange,
    onreset
  } = $props();

  const filters = [                                   // filter types + their labes for lb page
    { value: 'all', label: 'Everything' },
    { value: 'crew', label: 'Crew' },
    { value: 'solo', label: 'Solo' },
    { value: 'realistic', label: 'Realistic Physics (Solo)' }
  ];

  const views = [                                     // views eg lb and statistics mode
    { value: 'leaderboard', label: 'Leaderboard' },
    { value: 'statistics', label: 'Statistics', disabled: true }
  ];
</script>

<div class="filter-bar">
  <div class="group">
    <span class="group-label">Filter By:</span>
    <div class="pills">
      {#each filters as filterobj}              <!-- list all filters -->
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
      {#each views as viewobj}                  <!-- list all view buttons -->
        <button
          class="pill"
          class:active={activeView === viewobj.value}
          class:is-disabled={viewobj.disabled}
          disabled={viewobj.disabled}
          aria-disabled={viewobj.disabled ? 'true' : undefined}
          title={viewobj.disabled ? 'Statistics view is currently unavailable' : undefined}
          onclick={() => !viewobj.disabled && onviewchange?.(viewobj.value)}
        >{viewobj.label}</button>
      {/each}
    </div>
  </div>

  <button class="reset-btn" onclick={() => onreset?.()} aria-label="Reset filters">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  </button>
</div>

<style>
  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem 2rem;
    padding: 1rem 0;
  }

  .group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .group-label {
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--color-muted);
    white-space: nowrap;
  }

  .pills {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
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

  .pill.is-disabled,
  .pill.is-disabled:hover {
    opacity: 0.4;
    cursor: not-allowed;
    border-color: var(--color-border);
    color: var(--color-muted);
    background: var(--color-card-elevated);
  }

  .reset-btn {
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-btn);
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
