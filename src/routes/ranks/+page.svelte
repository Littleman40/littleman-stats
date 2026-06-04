<script>
  // auto-refresh rank data every 30 minutes
  const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

  // hardcoded percentile labels for each rank
  const PERCENTILES = {
    'Certified':    '0.1% (capped at 75)',
    'Sanctioned 3': '0.4%',
    'Sanctioned 2': '0.7%',
    'Sanctioned 1': '1%',
    'Ghost 3':      '2.33%',
    'Ghost 2':      '3.66%',
    'Ghost 1':      '5%',
    'Licensed 3':   '6.66%',
    'Licensed 2':   '8.33%',
    'Licensed 1':   '10%',
    'Marked 3':     '15%',
    'Marked 2':     '20%',
    'Marked 1':     '25%',
    'Noticed 3':    '33.33%',
    'Noticed 2':    '41.66%',
    'Noticed 1':    '50%',
    'Listed 3':     '66.66%',
    'Listed 2':     '83.33%',
    'Listed 1':     '100%',
  };

  let thresholds = $state([]);
  let lastUpdated = $state(null);
  let isLoading = $state(true);
  let loadError = $state(null);

  let refreshTimer;

  // transforms raw api data into ui ready format
  const processedThresholds = $derived(
    thresholds.map((threshold) => {

      // "Sanctioned 2" -> "sanctioned_2", matching the cdn filename format
      const iconSlug = threshold.tier_name.toLowerCase().replace(/\s+/g, '_');          
      
      // gets icon url
      const iconUrl = `https://cdn.nohesi.gg/images/rankicons/${iconSlug}.svg`;

      // returns icon url and display name
      return { ...threshold, iconUrl, displayName: threshold.tier_name };
    })
  );


  // fetches rank thresholds from the API and schedules the next auto-refresh
  async function fnLoadRanks() {
    isLoading = true;
    loadError = null;
    try {

      // fetches file
      const response = await fetch('/ranks.json');

      // error if bad response
      if (!response.ok) throw new Error('Rank file missing (HTTP ' + response.status + ')');
      
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      thresholds = data.thresholds ?? [];
      lastUpdated = data.generated_at ? new Date(data.generated_at) : null;
    } catch {
      loadError = 'Failed to load rank data. Please try again.';
    } finally { 
      isLoading = false;
    }

    // auto refresh logic
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(fnLoadRanks, REFRESH_INTERVAL_MS);
  }

  $effect(() => {
    fnLoadRanks();

    // cancel the pending auto-refresh when the page is left so we don't fetch in the background
    return () => clearTimeout(refreshTimer);
  });
  

  // formats number to include commas
  function fnFormatNumber(n) {
    return n.toLocaleString();
  }
</script>

<svelte:head>
  <title>Ranks - LittleMan Stats</title>
</svelte:head>

<div class="page page-wrapper">
  <div class="page-header">
    <h1>Rank Thresholds</h1>
    <p>Rank thresholds, player counts, and percentiles.</p>
  </div>

  {#if isLoading}
    <div class="table-wrap">
      <table class="ranks-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Min Score</th>
            <th>Lowest Position</th>
            <th>Number Of Players</th>
            <th>Percentile</th>
          </tr>
        </thead>
        <tbody>
          {#each Array(19) as _, i}
            <tr>
              <td>
                <div class="rank-cell">
                  <div class="skeleton skeleton-icon"></div>
                  <div class="skeleton skeleton-name" style="opacity: {1 - i * 0.04}"></div>
                </div>
              </td>
              <td><div class="skeleton skeleton-medium" style="opacity: {1 - i * 0.04}"></div></td>
              <td><div class="skeleton skeleton-short" style="opacity: {1 - i * 0.04}"></div></td>
              <td><div class="skeleton skeleton-short" style="opacity: {1 - i * 0.04}"></div></td>
              <td><div class="skeleton skeleton-short" style="opacity: {1 - i * 0.04}"></div></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if loadError}
    <div class="error-state">
      <p>{loadError}</p>
      <button class="retry-btn" onclick={fnLoadRanks}>Retry</button>
    </div>
  {:else}
    <div class="table-wrap">
      <table class="ranks-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Min Score</th>
            <th>Lowest Position</th>
            <th>Number Of Players</th>
            <th>Percentile</th>
          </tr>
        </thead>
        <tbody>
          {#each processedThresholds as t}
            <tr>
              <td>
                <div class="rank-cell">
                  <img src={t.iconUrl} alt="{t.displayName} icon" class="rank-icon" />
                  <span class="rank-name">{t.displayName}</span>
                </div>
              </td>
              <td class="cell-mono">{t.min_score != null ? fnFormatNumber(t.min_score) : '-'}</td>
              <td class="cell-mono">{t.lowest_position != null ? fnFormatNumber(t.lowest_position) : '-'}</td>
              <td class="cell-mono">{fnFormatNumber(t.player_count)}</td>
              <td class="cell-muted">{PERCENTILES[t.displayName] || '-'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if lastUpdated}
      <p class="last-updated">Last updated: {lastUpdated.toLocaleString()}</p>
    {/if}
  {/if}
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

  .table-wrap {
    width: 100%;
    border: 1px solid var(--color-border);
    border-radius: 0.7rem;
    overflow-x: auto;
    color-scheme: dark;
  }

  .ranks-table {
    min-width: 600px;
  }

  tbody tr:nth-child(odd) {
    background: var(--color-card);
  }

  tbody tr:nth-child(even) {
    background: var(--color-card-elevated);
  }

  .ranks-table {
    width: 100%;
    border-collapse: collapse;
  }

  .ranks-table thead tr {
    border-bottom: 1px solid var(--color-border);
  }

  .ranks-table th {
    padding: 0.75rem 1.25rem;
    text-align: left;
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-muted);
    white-space: nowrap;
  }

  .ranks-table tbody tr {
    border-top: 1px solid var(--color-border);
    transition: background 0.1s;
  }

  .ranks-table tbody tr:first-child {
    border-top: none;
  }

  .ranks-table tbody tr:hover {
    background: var(--color-card-elevated);
  }

  .ranks-table td {
    padding: 0.85rem 1.25rem;
    font-size: 0.875rem;
    color: var(--color-text);
    white-space: nowrap;
  }

  .rank-cell {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .rank-icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .rank-name {
    font-weight: 600;
  }

  .cell-muted {
    color: var(--color-muted);
  }

  .cell-mono {
    font-variant-numeric: tabular-nums;
  }

  /* skeletons */
  .skeleton {
    border-radius: 4px;
    background: var(--color-card-elevated);
    animation: pulse 1.5s ease-in-out infinite;
  }

  .skeleton-icon {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .skeleton-name  { height: 14px; width: 90px; }
  .skeleton-short { height: 14px; width: 56px; }
  .skeleton-medium { height: 14px; width: 110px; }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

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

  .last-updated {
    margin-top: 0.875rem;
    font-size: 0.75rem;
    color: var(--color-muted);
    text-align: right;
  }
</style>
