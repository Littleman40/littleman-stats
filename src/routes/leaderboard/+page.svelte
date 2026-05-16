<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import FilterBar from '$lib/components/FilterBar.svelte';
  import LeaderboardTable from '$lib/components/LeaderboardTable.svelte';
  import PaginationControls from '$lib/components/PaginationControls.svelte';

  let activeFilter = $state('all');
  let currentPageNumber = $state(1);

  let leaderboardRecords = $state([]);
  let startRank = $state(1);
  let canGoNext = $state(false);
  let canGoPrev = $state(false);
  let isLoading = $state(false);
  let loadError = $state(null);

  let latestRequestId = 0;  // increment each time we start a fetch, to order responses

  $effect(() => {
    const urlParams = $page.url.searchParams;
    const filterFromUrl = urlParams.get('filter') ?? 'all';
    const pageFromUrl = parseInt(urlParams.get('page') ?? '1', 10);

    activeFilter = filterFromUrl;
    currentPageNumber = pageFromUrl;
    fnLoadLeaderboardData(filterFromUrl, pageFromUrl);
  });

  async function fnLoadLeaderboardData(filterToLoad, pageNumberToLoad) { // called from the URL-watch $effect above and the Retry button in the template
    const thisRequestId = ++latestRequestId;
    isLoading = true;
    loadError = null;
    leaderboardRecords = [];

    try {
      const apiResponse = await fetch(`/api/leaderboard?filter=${filterToLoad}&page=${pageNumberToLoad}`);
      if (thisRequestId !== latestRequestId) return; // a newer fetch started while we were waiting - discard this stale response
      if (!apiResponse.ok) throw new Error('API error');
      const responseBody = await apiResponse.json();
      leaderboardRecords = responseBody.records ?? [];
      startRank = responseBody.startRank ?? 1;
      canGoNext = responseBody.hasNext ?? false;
      canGoPrev = responseBody.hasPrev ?? false;
    } catch {
      if (thisRequestId !== latestRequestId) return; // same staleness check on the error path so a stale failure doesn't overwrite a fresh success
      loadError = 'Failed to load data. Please try again.';
    } finally {
      if (thisRequestId === latestRequestId) isLoading = false; // only the latest fetch is allowed to flip the loading flag off
    }
  }

  function fnSyncUrl(filterToApply, pageNumberToApply) { // called from every handler below; the URL change is what triggers the load via the $effect above
    const urlParams = new URLSearchParams();
    urlParams.set('filter', filterToApply);
    urlParams.set('page', String(pageNumberToApply));
    goto(`/leaderboard?${urlParams}`, { replaceState: false, keepFocus: true, noScroll: true });
  }

  function fnHandleFilterChange(selectedFilter) { // called from FilterBar onfilterchange in the template below
    fnSyncUrl(selectedFilter, 1);
  }

  function fnHandleReset() { // called from FilterBar onreset in the template below
    fnSyncUrl('all', 1);
  }

  function fnHandlePrev() { // called from PaginationControls onprev in the template below
    fnSyncUrl(activeFilter, Math.max(1, currentPageNumber - 1));
  }

  function fnHandleNext() { // called from PaginationControls onnext in the template below
    fnSyncUrl(activeFilter, currentPageNumber + 1);
  }
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
    onfilterchange={fnHandleFilterChange}
    onreset={fnHandleReset}
  />

  {#if isLoading}
    <div class="scroll-wrap">
      <LeaderboardTable records={[]} {activeFilter} {startRank} />
      <div class="skeleton-wrap">
        {#each Array(20) as _, skeletonIndex}
          <div class="skeleton-row" style="opacity: {1 - skeletonIndex * 0.15}"></div>
        {/each}
      </div>
    </div>
  {:else if loadError}
    <div class="scroll-wrap">
      <LeaderboardTable records={leaderboardRecords} {activeFilter} {startRank} />
    </div>
    <div class="error-state">
      <p>{loadError}</p>
      <button class="retry-btn" onclick={() => fnLoadLeaderboardData(activeFilter, currentPageNumber)}>Retry</button>
    </div>
  {:else if leaderboardRecords.length === 0}
    <div class="empty-state">
      <p>No results found for this filter.</p>
    </div>
  {:else}
    <div class="scroll-wrap">
      <LeaderboardTable records={leaderboardRecords} {activeFilter} {startRank} />
    </div>
    <PaginationControls
      page={currentPageNumber}
      hasNext={canGoNext}
      hasPrev={canGoPrev}
      onprev={fnHandlePrev}
      onnext={fnHandleNext}
    />
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

  .scroll-wrap {
    width: 100%;
    overflow-x: auto;
    color-scheme: dark;
  }

  .skeleton-wrap {
    display: flex;
    flex-direction: column;
    min-width: 1213px;
  }

  .skeleton-row {
    height: 63px;
    background: var(--color-card-elevated);
    border-top: 1px solid var(--color-border);
    border-left: 1px solid var(--color-border);
    border-right: 1px solid var(--color-border);

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
