<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import FilterBar from '$lib/components/FilterBar.svelte';
  import LeaderboardTable from '$lib/components/LeaderboardTable.svelte';
  import PaginationControls from '$lib/components/PaginationControls.svelte';

  let activeFilter = $state('all');
  let currentPage = $state(1);

  let records = $state([]);
  let hasNext = $state(false);
  let hasPrev = $state(false);
  let loading = $state(false);
  let error = $state(null);

  $effect(() => {
    const params = $page.url.searchParams;
    const f = params.get('filter') ?? 'all';
    const p = parseInt(params.get('page') ?? '1', 10);

    if (f !== activeFilter || p !== currentPage) {
      activeFilter = f;
      currentPage = p;
      loadData();
    }
  });

  function syncUrl() {
    const params = new URLSearchParams();
    params.set('filter', activeFilter);
    params.set('page', String(currentPage));
    goto(`/leaderboard?${params}`, { replaceState: false, keepFocus: true, noScroll: true });
  }

  async function loadData() {
    loading = true;
    error = null;
    records = [];

    try {
      const res = await fetch(`/api/leaderboard?filter=${activeFilter}&page=${currentPage}`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      records = data.records ?? [];
      hasNext = data.hasNext ?? false;
      hasPrev = data.hasPrev ?? false;
    } catch {
      error = 'Failed to load data. Please try again.';
    } finally {
      loading = false;
    }
  }

  function handleFilterChange(f) {
    activeFilter = f;
    currentPage = 1;
    syncUrl();
  }

  function handleReset() {
    activeFilter = 'all';
    currentPage = 1;
    syncUrl();
  }

  function handlePrev() {
    currentPage = Math.max(1, currentPage - 1);
    syncUrl();
  }

  function handleNext() {
    currentPage = currentPage + 1;
    syncUrl();
  }

  $effect(() => {
    loadData();
  });
</script>

<svelte:head>
  <title>Leaderboard - LittleMan Stats</title>
</svelte:head>

<div class="page page-wrapper">
  <div class="page-header">
    <h1>No Hesi Global Leaderboard</h1>
    <p>Filter and sort the global leaderboard in all sorts of ways</p>
  </div>

  <FilterBar
    {activeFilter}
    activeView="leaderboard"
    onfilterchange={handleFilterChange}
    onreset={handleReset}
  />

  {#if error}
    <div class="error-state">
      <p>{error}</p>
      <button class="retry-btn" onclick={loadData}>Retry</button>
    </div>
  {/if}

  {#if !error}
    {#if loading}
      <div class="skeleton-wrap">
        {#each Array(5) as _, i}
          <div class="skeleton-row" style="opacity: {1 - i * 0.15}"></div>
        {/each}
      </div>
    {:else if records.length === 0}
      <div class="empty-state">
        <p>No results found for this filter.</p>
      </div>
    {:else}
      <LeaderboardTable {records} />
      <PaginationControls
        page={currentPage}
        {hasNext}
        {hasPrev}
        onprev={handlePrev}
        onnext={handleNext}
      />
    {/if}
  {/if}
</div>

<style>
  .page {
    padding-top: 2.5rem;
    padding-bottom: 4rem;
  }

  .page-header {
    margin-bottom: 0.5rem;
  }

  .page-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 0.4rem;
  }

  .page-header p {
    color: var(--color-muted);
    font-size: 0.95rem;
  }

  .skeleton-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .skeleton-row {
    height: 48px;
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }

  .empty-state,
  .error-state {
    padding: 3rem 0;
    text-align: center;
    color: var(--color-muted);
  }

  .retry-btn {
    margin-top: 1rem;
    padding: 0.5rem 1.25rem;
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-btn);
    color: var(--color-text);
    font-family: inherit;
    font-size: 0.875rem;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .retry-btn:hover {
    border-color: #555555;
  }
</style>
