<script>
  import SearchBar from '$lib/components/SearchBar.svelte';
  import ProfileCard from '$lib/components/ProfileCard.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import { fnFormatScore, fnFormatTime, fnFormatDateUTC } from '$lib/utils/formatters.js';

  let isLoadingPersonalBest = $state(false);
  let searchError = $state(null);
  let playerProfile = $state(null);

  let activeAbortController = null;

  function fnDetectQueryType(typedQuery) {
    return /^\d{17}$/.test(typedQuery) ? 'steamid' : 'username';
  }

  function fnIsAbortError(err) {
    return err?.name === 'AbortError';
  }

  const inputLabel = $derived(
    playerProfile?.input === 0 ? 'Wheel'
    : playerProfile?.input === 1 ? 'Controller'
    : playerProfile?.input === 2 ? 'Keyboard and Mouse'
    : playerProfile?.input != null ? String(playerProfile.input)
    : 'Unknown'
  );

  async function fnHandleUserSearch(typedQuery) {
    if (activeAbortController) {
      activeAbortController.abort();
    }
    const localController = new AbortController();
    activeAbortController = localController;
    const signal = localController.signal;

    isLoadingPersonalBest = true;
    searchError = null;
    playerProfile = null;

    const queryType = fnDetectQueryType(typedQuery);

    try {
      const pbResponse = await fetch(`/api/user-search/pb?query=${encodeURIComponent(typedQuery)}&type=${queryType}`, { signal });
      const pbData = await pbResponse.json();
      if (!pbResponse.ok || pbData.error) {
        searchError = pbData.error ?? 'Something went wrong. Please try again.';
        return;
      }
      playerProfile = pbData.profile;
    } catch (err) {
      if (fnIsAbortError(err)) return;
      searchError = 'Network error. Please try again.';
    } finally {
      if (!signal.aborted) isLoadingPersonalBest = false;
    }

    if (activeAbortController === localController) activeAbortController = null;
  }
</script>

<svelte:head>
  <title>User Search - LittleMan Stats</title>
</svelte:head>

<div class="page page-wrapper">
  <div class="page-header">
    <h1>Individual User's Stats</h1>
    <p>Find individual users specific stats, from total runs, run history, points over time and more!</p>
  </div>

  <div class="search-wrap">
    <SearchBar
      placeholder="Enter Steam ID or Username"
      onsubmit={fnHandleUserSearch}
    />
    {#if searchError}
      <p class="error-msg">{searchError}</p>
    {/if}
  </div>

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
    <div class="profile-section">
    <div class="results-layout">
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

  @media (max-width: 1024px) {
    .results-layout {
      grid-template-columns: 1fr;
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
  }
</style>
