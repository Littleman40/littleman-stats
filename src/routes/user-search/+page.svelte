<script>
  import SearchBar from '$lib/components/SearchBar.svelte';
  import ProfileCard from '$lib/components/ProfileCard.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import LineGraph from '$lib/components/LineGraph.svelte';
  import PieChart from '$lib/components/PieChart.svelte';
  import TallyList from '$lib/components/TallyList.svelte';
  import SectionLabel from '$lib/components/SectionLabel.svelte';
  import { fnFormatScore, fnFormatTime, fnFormatDateUTC } from '$lib/utils/formatters.js';

  let isLoadingPersonalBest = $state(false);
  let isLoadingSoloHistory = $state(false);
  let isLoadingCrewHistory = $state(false);
  let searchError = $state(null);

  let playerProfile = $state(null);
  let resolvedSteamId = $state(null);
  let soloHistory = $state(null);
  let crewHistory = $state(null);

  let historyMode = $state('solo'); // 'solo' | 'crew' | 'combined'

  let activeAbortController = null;                                                 // tracks the AbortController for the in-flight search so a new search can cancel it

  function fnDetectQueryType(typedQuery) {                                          // a 17-digit numeric string is a steam id, anything else is a username
    return /^\d{17}$/.test(typedQuery) ? 'steamid' : 'username';
  }

  function fnMergeDistributions(distA, distB) {                                     // combines two { label: count } objects by summing counts of shared keys
    const merged = { ...distA };
    for (const [key, value] of Object.entries(distB)) {
      merged[key] = (merged[key] ?? 0) + value;
    }
    return merged;
  }

  const combinedHistory = $derived.by(() => {                                       // built lazily from solo+crew so the 'Combined' tab can show a merged view
    if (!soloHistory || !crewHistory) return null;
    const soloCount = soloHistory.points_over_time.length;
    const crewCount = crewHistory.points_over_time.length;
    const totalCount = soloCount + crewCount;
    return {
      points_over_time: [...soloHistory.points_over_time, ...crewHistory.points_over_time]
        .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at)),
      traffic_distribution: fnMergeDistributions(soloHistory.traffic_distribution, crewHistory.traffic_distribution),
      tracks_distribution: fnMergeDistributions(soloHistory.tracks_distribution, crewHistory.tracks_distribution),
      input_distribution: fnMergeDistributions(soloHistory.input_distribution ?? {}, crewHistory.input_distribution ?? {}),
      cars_tally: fnMergeDistributions(soloHistory.cars_tally, crewHistory.cars_tally),
      avg_run_time: totalCount > 0
        ? (soloHistory.avg_run_time * soloCount + crewHistory.avg_run_time * crewCount) / totalCount
        : 0,
      most_runs_in_a_day: Math.max(soloHistory.most_runs_in_a_day, crewHistory.most_runs_in_a_day)
    };
  });

  const activeHistory = $derived.by(() => {                                         // picks which history dataset to show based on the active tab
    if (historyMode === 'crew') return crewHistory;
    if (historyMode === 'combined') return combinedHistory;
    return soloHistory;
  });

  const activeRunCount = $derived(activeHistory?.points_over_time?.length ?? 0);   // total runs in the currently-selected history view

  const inputLabel = $derived(                                                      // the api returns input as a numeric code — translate to a human label (kept in sync with INPUT_CODE_LABELS in /api/user-search/history)
    playerProfile?.input === 0 ? 'Wheel'
    : playerProfile?.input === 1 ? 'Controller'
    : playerProfile?.input === 2 ? 'Keyboard and Mouse'
    : playerProfile?.input != null ? String(playerProfile.input)
    : 'Unknown'
  );

  const crewTabAvailable = $derived(crewHistory !== null && !isLoadingCrewHistory);
  const combinedTabAvailable = $derived(soloHistory !== null && crewHistory !== null);

  function fnOrdinalSuffix(dayNumber) {                                             // returns the english ordinal suffix for a day number — 1->st, 2->nd, 3->rd, 11->th, etc
    const lastTwoDigits = dayNumber % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return 'th';
    switch (dayNumber % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  function fnFormatSinceDate(isoTimestamp) {                                        // formats an iso timestamp as 'May 5th' for the 'runs since ...' header line
    if (!isoTimestamp) return null;
    const parsedDate = new Date(isoTimestamp);
    const monthName = parsedDate.toLocaleString('en-US', { month: 'long' });
    const dayNumber = parsedDate.getDate();
    return `${monthName} ${dayNumber}${fnOrdinalSuffix(dayNumber)}`;
  }

  const soloEarliestSince = $derived(fnFormatSinceDate(soloHistory?.points_over_time?.[0]?.submitted_at));
  const crewEarliestSince = $derived(fnFormatSinceDate(crewHistory?.points_over_time?.[0]?.submitted_at));

  function fnIsAbortError(err) {                                                    // true when a fetch was aborted via AbortController — used to suppress noise when a new search supersedes an old one
    return err?.name === 'AbortError';
  }

  async function fnHandleUserSearch(typedQuery) {                                   // called from SearchBar onsubmit in the template below — runs the 4-phase fetch pipeline
    if (activeAbortController) {                                                    // cancel any in-flight requests from a previous search so their results don't race in
      activeAbortController.abort();
    }
    const localController = new AbortController();
    activeAbortController = localController;
    const signal = localController.signal;

    // reset state - both skeletons turn on at the same time so the layout settles immediately on submit
    isLoadingPersonalBest = true;
    isLoadingSoloHistory = true;
    isLoadingCrewHistory = false;
    searchError = null;
    playerProfile = null;
    resolvedSteamId = null;
    soloHistory = null;
    crewHistory = null;
    historyMode = 'solo';

    const queryType = fnDetectQueryType(typedQuery);

    // phase 1: personal best (also resolves username -> steam id server-side)
    try {
      const pbResponse = await fetch(`/api/user-search/pb?query=${encodeURIComponent(typedQuery)}&type=${queryType}`, { signal });
      const pbData = await pbResponse.json();
      if (!pbResponse.ok || pbData.error) {
        searchError = pbData.error ?? 'Something went wrong. Please try again.';
        isLoadingSoloHistory = false;                                                 // clear the history skeleton too on a failed lookup so the page falls back to its empty state
        return;
      }
      playerProfile = pbData.profile;
      resolvedSteamId = pbData.steamId;
    } catch (err) {
      if (fnIsAbortError(err)) return;
      searchError = 'Network error. Please try again.';
      isLoadingSoloHistory = false;
      return;
    } finally {
      if (!signal.aborted) isLoadingPersonalBest = false;
    }

    // phase 2: total runs count (fast — peeks the first history page for the upstream-reported total)
    try {
      const totalsResponse = await fetch(`/api/user-search/totals?steamid=${encodeURIComponent(resolvedSteamId)}`, { signal });
      const totalsData = await totalsResponse.json();
      if (totalsResponse.ok && !totalsData.error) {
        playerProfile = { ...playerProfile, total_runs: totalsData.total_runs };
      }
    } catch (err) {
      if (fnIsAbortError(err)) return;
      // non-fatal — total_runs stays 0
    }

    // phase 3: full solo history (isLoadingSoloHistory was already set true at the top of the search)
    try {
      const soloResponse = await fetch(`/api/user-search/history?steamid=${encodeURIComponent(resolvedSteamId)}&mode=solo`, { signal });
      const soloData = await soloResponse.json();
      if (soloResponse.ok && !soloData.error) {
        soloHistory = soloData.history;
      }
    } catch (err) {
      if (fnIsAbortError(err)) return;
      // non-fatal
    } finally {
      if (!signal.aborted) isLoadingSoloHistory = false;
    }

    // phase 4: full crew history
    isLoadingCrewHistory = true;
    try {
      const crewResponse = await fetch(`/api/user-search/history?steamid=${encodeURIComponent(resolvedSteamId)}&mode=team`, { signal });
      const crewData = await crewResponse.json();
      if (crewResponse.ok && !crewData.error) {
        crewHistory = crewData.history;
      }
    } catch (err) {
      if (fnIsAbortError(err)) return;
      // non-fatal
    } finally {
      if (!signal.aborted) isLoadingCrewHistory = false;
    }

    if (activeAbortController === localController) activeAbortController = null;
  }
</script>

<svelte:head>
  <title>User Search - LittleMan Stats</title>
</svelte:head>

<div class="page page-wrapper">
  <!-- header -->
  <div class="page-header">
    <h1>Individual User's Stats</h1>
    <p>Find individual users specific stats, from total runs, run history, points over time and more!</p>
  </div>

  <!-- search bar -->
  <div class="search-wrap">
    <SearchBar
      placeholder="Enter Steam ID or Username"
      onsubmit={fnHandleUserSearch}
    />
    {#if searchError}
      <p class="error-msg">{searchError}</p>
    {/if}
  </div>

  <!-- loading personal best - skeleton mirrors the real profile-section layout so there's no shift on load -->
  {#if isLoadingPersonalBest}
    <div class="profile-section">
      <div class="results-layout">
        <div class="left-col">
          <div class="sk-profile-card">
            <div class="sk-identity">
              <div class="sk-block sk-avatar"></div>
              <div class="sk-name-block">
                <div class="sk-block sk-bar sk-name-bar"></div>
                <div class="sk-block sk-bar sk-steamid-bar"></div>
              </div>
            </div>
            <div class="sk-divider"></div>
            <div class="sk-stat-rows">
              <div class="sk-stat-row">
                <div class="sk-block sk-bar sk-label-bar"></div>
                <div class="sk-block sk-bar sk-value-bar"></div>
              </div>
              <div class="sk-stat-row">
                <div class="sk-block sk-bar sk-label-bar"></div>
                <div class="sk-block sk-bar sk-value-bar"></div>
              </div>
            </div>
            <div class="sk-rank-icon-wrap">
              <div class="sk-block sk-rank-icon"></div>
            </div>
          </div>
        </div>
        <div class="right-col">
          <div class="stats-grid">
            <div class="sk-stat-card">
              <div class="sk-block sk-bar sk-label-bar"></div>
              <div class="sk-block sk-bar sk-value-bar"></div>
            </div>
            <div class="sk-stat-card">
              <div class="sk-block sk-bar sk-label-bar"></div>
              <div class="sk-block sk-bar sk-value-bar"></div>
            </div>
            <div class="sk-stat-card">
              <div class="sk-block sk-bar sk-label-bar"></div>
              <div class="sk-block sk-bar sk-value-bar"></div>
            </div>
            <div class="span-rows">
              <div class="sk-stat-card sk-stat-card-tall">
                <div class="sk-block sk-bar sk-label-bar"></div>
                <div class="sk-block sk-bar sk-value-bar"></div>
              </div>
            </div>
            <div class="span-rows">
              <div class="sk-stat-card sk-stat-card-tall">
                <div class="sk-block sk-bar sk-label-bar"></div>
                <div class="sk-block sk-bar sk-value-bar"></div>
              </div>
            </div>
            <div class="sk-stat-card">
              <div class="sk-block sk-bar sk-label-bar"></div>
              <div class="sk-block sk-bar sk-value-bar"></div>
            </div>
            <div class="sk-stat-card">
              <div class="sk-block sk-bar sk-label-bar"></div>
              <div class="sk-block sk-bar sk-value-bar"></div>
            </div>
            <div class="sk-stat-card">
              <div class="sk-block sk-bar sk-label-bar"></div>
              <div class="sk-block sk-bar sk-value-bar"></div>
            </div>
            <div class="span-cols">
              <div class="sk-stat-card">
                <div class="sk-block sk-bar sk-label-bar"></div>
                <div class="sk-block sk-bar sk-value-bar"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {:else if playerProfile}
    <!-- profile + stats row (wrapped in an elevated panel so the inner cards layer on top of it) -->
    <div class="profile-section">
    <div class="results-layout">
      <!-- left: profile card (team members now live inside the card so the column height stays fixed) -->
      <div class="left-col">
        <ProfileCard
          nohesi_pfp={playerProfile.nohesi_pfp}
          nohesi_name={playerProfile.nohesi_name}
          steam_id={playerProfile.steam_id}
          rank_position={playerProfile.rank_position}
          tier_name={playerProfile.tier_name}
          mode={playerProfile.mode}
          team_names={playerProfile.team_names}
        />
      </div>

      <!-- right: personal best stats grid -->
      <div class="right-col">
        <div class="stats-grid">
          <StatCard label="Score" value={fnFormatScore(playerProfile.score) || 'Unknown'} />
          <StatCard label="Combo" value={playerProfile.combo ?? 'Unknown'} />
          <StatCard label="Time" value={fnFormatTime(playerProfile.run_time) || 'Unknown'} />

          <div class="span-rows">
            <StatCard
              label="Car"
              value={playerProfile.car_model || 'Unknown'}
              backgroundImage={playerProfile.car_model ? `https://cdn.nohesi.gg/carimages/${playerProfile.car_model}.webp` : null}
            />
          </div>
          <div class="span-rows">
            <StatCard label="Map" value={playerProfile.map || 'Unknown'} />
          </div>
          <StatCard label="Traffic" value={playerProfile.traffic_type || 'Unknown'} />
          <StatCard label="Server" value={playerProfile.server_name || 'Unknown'} />

          <StatCard label="Input" value={inputLabel} />
          <div class="span-cols">
            <StatCard label="Date / Time Set" value={fnFormatDateUTC(playerProfile.updated_at) || 'Unknown'} />
          </div>
        </div>
      </div>
    </div>
    </div>
  {/if}

  <!-- history section - skeleton stays mounted from search submit until solo history loads; the real header + filter bar render even while the inner charts are still skeletons -->
  {#if isLoadingSoloHistory}
    <div class="history-wrap">
      <div class="history-section">
        <div class="history-header">
          <div class="history-title">
            <h2>Run History</h2>
          </div>

          <div class="filter-group">
            <span class="filter-group-label">Mode:</span>
            <div class="filter-pills">
              <button
                class="filter-pill"
                class:active={historyMode === 'solo'}
                onclick={() => historyMode = 'solo'}
              >Solo</button>

              <button
                class="filter-pill"
                class:active={historyMode === 'crew'}
                class:is-disabled={!crewTabAvailable}
                disabled={!crewTabAvailable}
                onclick={() => crewTabAvailable && (historyMode = 'crew')}
              >Crew{#if isLoadingCrewHistory}&nbsp;<span class="tab-spinner"></span>{/if}</button>

              <button
                class="filter-pill"
                class:active={historyMode === 'combined'}
                class:is-disabled={!combinedTabAvailable}
                disabled={!combinedTabAvailable}
                onclick={() => combinedTabAvailable && (historyMode = 'combined')}
              >Combined</button>
            </div>
          </div>
        </div>

        <div class="history-block">
          <SectionLabel text="Points Over Time" />
          <div class="sk-block sk-graph"></div>
        </div>

        <div class="charts-row">
          <div class="chart-block"><div class="sk-block sk-pie"></div></div>
          <div class="chart-block"><div class="sk-block sk-pie"></div></div>
          <div class="chart-block"><div class="sk-block sk-pie"></div></div>
        </div>

        <div class="history-block">
          <SectionLabel text="Run Info" />
          <div class="run-info-grid">
            <div class="sk-stat-card">
              <div class="sk-block sk-bar sk-label-bar"></div>
              <div class="sk-block sk-bar sk-value-bar"></div>
            </div>
            <div class="sk-stat-card">
              <div class="sk-block sk-bar sk-label-bar"></div>
              <div class="sk-block sk-bar sk-value-bar"></div>
            </div>
            <div class="sk-stat-card">
              <div class="sk-block sk-bar sk-label-bar"></div>
              <div class="sk-block sk-bar sk-value-bar"></div>
            </div>
          </div>
        </div>

        <div class="history-block">
          <SectionLabel text="Cars Used" />
          <ul class="sk-tally-list">
            <li class="sk-block sk-tally-row"></li>
            <li class="sk-block sk-tally-row"></li>
            <li class="sk-block sk-tally-row"></li>
            <li class="sk-block sk-tally-row"></li>
            <li class="sk-block sk-tally-row"></li>
          </ul>
        </div>
      </div>
    </div>
  {:else if soloHistory}
      <div class="history-wrap">
        <div class="history-section">
          <div class="history-header">
            <div class="history-title">
              <h2>Run History</h2>
              {#if soloEarliestSince || crewEarliestSince}
                <p class="history-since">
                  {#if soloEarliestSince}<span>Solo runs since {soloEarliestSince}</span>{/if}
                  {#if soloEarliestSince && crewEarliestSince}<span class="since-sep">/</span>{/if}
                  {#if crewEarliestSince}<span>Crew runs since {crewEarliestSince}</span>{/if}
                </p>
              {/if}
            </div>

            <!-- mode selector - styled to match the leaderboard FilterBar (rounded group + pill buttons) -->
            <div class="filter-group">
              <span class="filter-group-label">Mode:</span>
              <div class="filter-pills">
                <button
                  class="filter-pill"
                  class:active={historyMode === 'solo'}
                  onclick={() => historyMode = 'solo'}
                >Solo</button>

                <button
                  class="filter-pill"
                  class:active={historyMode === 'crew'}
                  class:is-disabled={!crewTabAvailable}
                  disabled={!crewTabAvailable}
                  onclick={() => crewTabAvailable && (historyMode = 'crew')}
                >Crew{#if isLoadingCrewHistory}&nbsp;<span class="tab-spinner"></span>{/if}</button>

                <button
                  class="filter-pill"
                  class:active={historyMode === 'combined'}
                  class:is-disabled={!combinedTabAvailable}
                  disabled={!combinedTabAvailable}
                  onclick={() => combinedTabAvailable && (historyMode = 'combined')}
                >Combined</button>
              </div>
            </div>
          </div>

          <!-- points over time -->
          <div class="history-block">
            <SectionLabel text="Points Over Time" />
            {#if historyMode === 'combined' && soloHistory && crewHistory}
              <LineGraph multiData={{ solo: soloHistory.points_over_time, crew: crewHistory.points_over_time }} />
            {:else if activeHistory?.points_over_time?.length}
              <LineGraph data={activeHistory.points_over_time} />
            {:else}
              <div class="unknown-block">Unknown</div>
            {/if}
          </div>

          <!-- distributions (traffic + tracks + camera type) -->
          {#if activeHistory}
            <div class="charts-row">
              <div class="chart-block">
                <PieChart distribution={activeHistory.traffic_distribution ?? {}} title="Traffic Distribution" />
              </div>
              <div class="chart-block">
                <PieChart distribution={activeHistory.tracks_distribution ?? {}} title="Tracks" />
              </div>
              <div class="chart-block">
                <PieChart distribution={activeHistory.input_distribution ?? {}} title="Input" />
              </div>
            </div>

            <!-- run info summary -->
            <div class="history-block">
              <SectionLabel text="Run Info" />
              <div class="run-info-grid">
                <StatCard label="Total Runs" value={activeRunCount > 0 ? activeRunCount.toLocaleString() : 'Unknown'} />
                <StatCard label="Average Run Time" value={fnFormatTime(activeHistory.avg_run_time) || 'Unknown'} />
                <StatCard label="Most Runs in a Day" value={activeHistory.most_runs_in_a_day ?? 'Unknown'} />
              </div>
            </div>

            <!-- cars used -->
            {#if activeHistory.cars_tally && Object.keys(activeHistory.cars_tally).length}
              <div class="history-block">
                <SectionLabel text="Cars Used" />
                <TallyList tally={activeHistory.cars_tally} />
              </div>
            {/if}
          {/if}
        </div>
      </div>
    {/if}
</div>

<style>
  .page {
    padding-top: 2.5rem;
    padding-bottom: 4rem;
  }

  .page-header {
    margin-bottom: 2rem;
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

  .search-wrap {
    margin-bottom: 2.5rem;
  }

  .error-msg {
    margin-top: 0.75rem;
    color: var(--color-error);
    font-size: 0.9rem;
  }

  .sk-block {
    background: var(--color-card-raised);
    border-radius: 0.3rem;
    position: relative;
    overflow: hidden;
  }

  .sk-block::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.04) 50%, transparent 100%);
    animation: sk-shimmer 1.6s ease-in-out infinite;
  }

  @keyframes sk-shimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .sk-profile-card {
    background: var(--color-card-raised);
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    padding: 1.25rem;
    height: 381.6px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .sk-identity {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }

  .sk-avatar {
    width: 52px;
    height: 52px;
    border-radius: 6px;
    flex-shrink: 0;
  }

  .sk-name-block {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    flex: 1;
    min-width: 0;
  }

  .sk-name-bar {
    width: 70%;
    height: 1rem;
  }

  .sk-steamid-bar {
    width: 90%;
    height: 0.75rem;
  }

  .sk-divider {
    height: 1px;
    background: var(--color-border);
  }

  .sk-stat-rows {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .sk-stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .sk-rank-icon-wrap {
    display: flex;
    justify-content: center;
    padding-top: 0.25rem;
  }

  .sk-rank-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
  }

  .sk-stat-card {
    background: var(--color-card-raised);
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    height: 91.81px;
  }

  .sk-stat-card-tall {
    height: 186.18px;
  }

  .sk-bar {
    display: block;
  }

  .sk-label-bar {
    width: 40%;
    height: 0.7rem;
  }

  .sk-value-bar {
    width: 65%;
    height: 1.1rem;
  }

  .sk-graph {
    width: 100%;
    height: 300px;
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
  }

  .sk-pie {
    width: 100%;
    height: 350px;
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    flex: 1;
  }

  .sk-tally-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .sk-tally-row {
    height: 2.4rem;
    border-radius: 0.4rem;
    border: 1px solid var(--color-border);
  }

  .profile-section {
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: 0.7rem;
    padding: 0.3rem;
    margin-bottom: 3rem;
  }

  .profile-section :global(.profile-card),
  .profile-section :global(.stat-card) {
    background: var(--color-card-raised);
  }

  .results-layout {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 0.3rem;
    align-items: stretch;
  }

  .left-col {
    display: flex;
    flex-direction: column;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.3rem;
  }

  .span-rows {
    grid-row: span 2;
    display: flex;
    flex-direction: column;
  }

  .span-rows > :global(.stat-card) {
    flex: 1;
  }

  .span-cols {
    grid-column: span 2;
  }

  .history-wrap {
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: 0.7rem;
    padding: 1rem;
  }

  .history-wrap :global(.stat-card),
  .history-wrap :global(.graph-wrap),
  .history-wrap :global(.pie-wrap),
  .history-wrap :global(.tally-row) {
    background: var(--color-card-raised);
  }

  .history-section {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .history-title {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .history-header h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .history-since {
    font-size: 0.85rem;
    color: var(--color-muted);
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .history-since .since-sep {
    opacity: 0.5;
  }
  .filter-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding: 0.3rem;
    padding-left: 0.9rem;
    border: 1px solid var(--color-border);
    border-radius: 3rem;
    background: var(--color-card-elevated);
  }

  .filter-group-label {
    font-size: 0.75rem;
    font-weight: 1000;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--color-muted);
    white-space: nowrap;
  }

  .filter-pills {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .filter-pill {
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

  .filter-pill:hover {
    border-color: #555555;
    color: var(--color-text);
  }

  .filter-pill.active {
    background: var(--color-text);
    color: var(--color-text-on-light);
    border-color: var(--color-text);
  }

  .filter-pill.is-disabled,
  .filter-pill.is-disabled:hover {
    opacity: 0.4;
    cursor: not-allowed;
    border-color: var(--color-border);
    color: var(--color-muted);
    background: var(--color-card-elevated);
  }

  .tab-spinner {
    display: inline-block;
    width: 8px;
    height: 8px;
    border: 1.5px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    vertical-align: middle;
  }

  .history-block {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .unknown-block {
    width: 100%;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    color: var(--color-muted);
    font-size: 0.9rem;
  }

  .charts-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 0.3rem;
    align-items: stretch;
  }

  .chart-block {
    display: flex;
  }

  .chart-block > :global(.pie-wrap) {
    flex: 1;
  }

  .run-info-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.3rem;
  }

  @media (max-width: 1024px) {
    .results-layout {
      grid-template-columns: 1fr;
    }

    .run-info-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .span-rows {
      grid-row: span 1;
    }

    .span-cols {
      grid-column: span 2;
    }

    .run-info-grid {
      grid-template-columns: 1fr;
    }

    .history-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
