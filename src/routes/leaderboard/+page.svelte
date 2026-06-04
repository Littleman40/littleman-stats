<script>
  // for updating the URL without a full page refresh
  import { goto } from '$app/navigation';
  // provides access to current url
  import { page } from '$app/state';
  import FilterBar from '$lib/components/FilterBar.svelte';
  import LeaderboardTable from '$lib/components/LeaderboardTable.svelte';
  import PaginationControls from '$lib/components/PaginationControls.svelte';
  import StatisticsView from '$lib/components/StatisticsView.svelte';

  let activeFilter = $state('all');
  let currentPageNumber = $state(1);
  let activeView = $state('leaderboard');

  let leaderboardRecords = $state([]);
  let startRank = $state(1);
  let canGoNext = $state(false);
  let canGoPrev = $state(false);
  let isLoading = $state(false);
  let loadError = $state(null);

  let stats = $state(null);
  let statsLoading = $state(false);
  let statsError = $state(null);

  // increment each time we start a fetch, to order responses
  let latestRequestId = 0;

  // re-runs whenever the URL changes - reads filter + page + view from the URL and triggers the right fetch
  $effect(() => {
    // reads current url
    const urlParams = page.url.searchParams;

    // reads filter, and defaults to all 
    const filterFromUrl = urlParams.get('filter') ?? 'all';

    // reads page number and defaults to 1
    const pageFromUrl = parseInt(urlParams.get('page') ?? '1', 10);

    // reads view and defaults to leaderboard
    const viewFromUrl = urlParams.get('view') ?? 'leaderboard';

    activeFilter = filterFromUrl;
    currentPageNumber = pageFromUrl;
    activeView = viewFromUrl;

    // statistics view reads from the static stats.json snapshot, not the live api
    if (viewFromUrl === 'statistics') {
      if (stats === null && !statsLoading) fnLoadStats();
    } else {

      // loads leaderboard when not in stats mode
      fnLoadLeaderboardData(filterFromUrl, pageFromUrl);
    }
  });



  // fetches the leaderboard data - called from the URL-watch $effect above and the Retry button in the template
  async function fnLoadLeaderboardData(filterToLoad, pageNumberToLoad) {
    
    // marks this request as the newest
    const thisRequestId = ++latestRequestId;
    isLoading = true;
    loadError = null;
    leaderboardRecords = [];

    try {

      // calls api
      const apiResponse = await fetch(`/api/leaderboard?filter=${filterToLoad}&page=${pageNumberToLoad}`);
      
      // a newer fetch started while we were waiting - discard this stale response
      if (thisRequestId !== latestRequestId) return;

      // fails on bad response
      if (!apiResponse.ok) throw new Error('API error');

      const responseBody = await apiResponse.json();

      leaderboardRecords = responseBody.records ?? [];
      startRank = responseBody.startRank ?? 1;
      canGoNext = responseBody.hasNext ?? false;
      canGoPrev = responseBody.hasPrev ?? false;

    } catch {

      // same staleness check on the error path so a stale failure doesn't overwrite a fresh success
      if (thisRequestId !== latestRequestId) return;
      loadError = 'Failed to load data. Please try again.';
    } finally {

      // only the latest fetch is allowed to flip the loading flag off
      if (thisRequestId === latestRequestId) isLoading = false;
    }
  }


  // loads static stats - called from the URL-watch $effect above and the StatisticsView retry callback in the template
  async function fnLoadStats() {
    statsLoading = true;
    statsError = null;
    try {

      // fetches file
      const response = await fetch('/stats.json');

      // fails on bad response
      if (!response.ok) throw new Error(`Stats file missing (HTTP ${response.status})`);
      stats = await response.json();
    } catch (err) {
      statsError = err.message;
    } finally {
      statsLoading = false;
    }
  }


  // builds and navigates to the url - called from every handler below; the URL change is what triggers the load via the $effect above
  function fnSyncUrl(filterToApply, pageNumberToApply, viewToApply) {
    const urlParams = new URLSearchParams();
    urlParams.set('filter', filterToApply);
    urlParams.set('page', String(pageNumberToApply));

    // omit the default to keep canonical urls short
    if (viewToApply && viewToApply !== 'leaderboard') {
      urlParams.set('view', viewToApply);
    }

    // navigate to new url without reloading
    goto(`/leaderboard?${urlParams}`, { replaceState: false, keepFocus: true, noScroll: true });
  }

  // called from FilterBar onfilterchange in the template below
  function fnHandleFilterChange(selectedFilter) {
    fnSyncUrl(selectedFilter, 1, activeView);
  }

  // called from FilterBar onviewchange in the template below
  function fnHandleViewChange(selectedView) {
    fnSyncUrl(activeFilter, 1, selectedView);
  }

  // called from FilterBar onreset in the template below
  function fnHandleReset() {
    fnSyncUrl('all', 1, activeView);
  }

  // called from PaginationControls onprev in the template below
  function fnHandlePrev() {
    fnSyncUrl(activeFilter, Math.max(1, currentPageNumber - 1), activeView);
  }

  // called from PaginationControls onnext in the template below
  function fnHandleNext() {
    fnSyncUrl(activeFilter, currentPageNumber + 1, activeView);
  }
</script>

<svelte:head>
  <title>Leaderboard - LittleMan Stats</title>
</svelte:head>

<div class="page page-wrapper">
  <div class="page-header">
    <h1>No Hesi Global Leaderboard</h1>
    <p>Filter the global leaderboard in all sorts of ways and find specifically tailored statistics for each filter.</p>
  </div>

  <div>
    <FilterBar
      {activeFilter}
      {activeView}
      onfilterchange={fnHandleFilterChange}
      onviewchange={fnHandleViewChange}
      onreset={fnHandleReset}
    />

    {#if activeView === 'statistics'}
      <StatisticsView
        filters={stats?.filters}
        {activeFilter}
        loading={statsLoading}
        error={statsError}
        onretry={fnLoadStats}
      />
    {:else if isLoading}
      <div class="scroll-wrap">
        <div class="scroll-inner">
          <LeaderboardTable records={[]} {activeFilter} {startRank} />
          <div class="skeleton-wrap">
            {#each Array(20) as _, skeletonIndex}
              <div class="skeleton-row" style="opacity: {1 - skeletonIndex * 0.15}"></div>
            {/each}
          </div>
        </div>
      </div>
    {:else if loadError}
      <div class="scroll-wrap">
        <div class="scroll-inner">
          <LeaderboardTable records={leaderboardRecords} {activeFilter} {startRank} />
        </div>
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
        <div class="scroll-inner">
          <LeaderboardTable records={leaderboardRecords} {activeFilter} {startRank} />
        </div>
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
</div>

<style>
  .page {
    padding-top: 2.5rem;
    padding-bottom: 4rem;
  }

  .page-header {
    margin-bottom: 1.5rem;
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
    margin-top: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 0.7rem;
    overflow: hidden;
  }

  .scroll-inner {
    width: 100%;
    overflow: auto;
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
