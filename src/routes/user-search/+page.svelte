<script>
  import SearchBar from '$lib/components/SearchBar.svelte';
  import UserIdentityCard from '$lib/components/UserIdentityCard.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import { fnFormatScore, fnFormatTime, fnFormatDateUTC } from '$lib/utils/formatters.js';

  let isLoadingPersonalBest = $state(false);
  let searchError = $state(null);
  let playerIdentity = $state(null);
  let playerMaps = $state([]);

  let activeAbortController = null;

  // only maps the player actually has a run on get their own card
  const mapsWithPersonalBest = $derived(playerMaps.filter((mapEntry) => mapEntry.has_pb));

  function fnIsAbortError(err) {
    return err?.name === 'AbortError';
  }


  // maps input numbers to labels for display
  function fnInputLabel(inputCode) {
    if (inputCode === 0) return 'Wheel';
    if (inputCode === 1) return 'Controller';
    if (inputCode === 2) return 'Keyboard and Mouse';
    if (inputCode != null) return String(inputCode);
    return 'Unknown';
  }


  // main function to handle user search
  async function fnHandleUserSearch(typedQuery) {

    // cancels any previous search
    if (activeAbortController) {
      activeAbortController.abort();
    }

    // starts new search
    const localController = new AbortController();
    activeAbortController = localController;
    const signal = localController.signal;

    isLoadingPersonalBest = true;
    searchError = null;
    playerIdentity = null;
    playerMaps = [];

    try {
      // calls api - the endpoint takes a username or a steam id and checks all three maps
      const pbResponse = await fetch(`/api/user-search/pb?query=${encodeURIComponent(typedQuery)}`, { signal });
      const pbData = await pbResponse.json();

      if (!pbResponse.ok || pbData.error) {
        searchError = pbData.error ?? 'Something went wrong. Please try again.';
        return;
      }

      // returns identity plus one entry per map
      playerIdentity = pbData.identity;
      playerMaps = pbData.maps ?? [];
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
    <p>Find a users personal best and profile information.</p>
  </div>

  <div class="search-wrap">
    <SearchBar
      placeholder="Enter Steam ID or Username"
      onsubmit={fnHandleUserSearch}
    />
    {#if searchError}
      <div class="error-card">
        <p class="error-card-title">{searchError}</p>
        <div class="error-card-tips">
          <p class="error-tips-heading">How to find your details:</p>
          <ul>
            <li><strong>Steam ID</strong> - We require you to search via your SteamID64, which is a 17-digit ID that can be found in your Steam profile URL (e.g. <code>/profiles/76561198000000000</code>).</li>
            <li><strong>Username</strong> - We require you to use the exact username shown on <a href="https://nohesi.gg" target="_blank" rel="noopener noreferrer">No Hesi website's</a> profile page.</li>
          </ul>
        </div>
      </div>
    {/if}
  </div>

  {#if isLoadingPersonalBest}

    <!-- identity card placeholder, sitting where the real one lands -->
    <div class="profile-section">
      <div class="sk-identity-card">
        <div class="sk-identity">
          <div class="sk-block sk-avatar"></div>
          <div class="sk-name-block">
            <div class="sk-block sk-bar sk-name-bar"></div>
            <div class="sk-block sk-bar sk-steamid-bar"></div>
          </div>
        </div>

        <!-- all three map slots show while loading, since we don't know yet which ones the player has -->
        {#each Array(3) as _unusedMapSlot}
          <div class="sk-v-divider"></div>
          <div class="sk-map-rank">
            <div class="sk-rank-text">
              <div class="sk-block sk-bar sk-position-bar"></div>
              <div class="sk-block sk-bar sk-tier-bar"></div>
            </div>
            <div class="sk-block sk-rank-icon"></div>
          </div>
        {/each}
      </div>
    </div>

    <!-- one placeholder per map card -->
    {#each Array(3) as _unusedMapCard}
      <div class="profile-section">
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
    {/each}

  {:else if playerIdentity}

    <!-- card 1 - who they are, plus their standing on each of the three boards -->
    <div class="profile-section">
      <UserIdentityCard
        nohesi_pfp={playerIdentity.nohesi_pfp}
        nohesi_name={playerIdentity.nohesi_name}
        steam_id={playerIdentity.steam_id}
        maps={playerMaps}
      />
    </div>

    <!-- one card per map they actually have a run on -->
    {#each mapsWithPersonalBest as mapEntry (mapEntry.slug)}
      <div class="profile-section">
        <div class="stats-grid">
          <StatCard label="Score" value={fnFormatScore(mapEntry.score) || 'Unknown'} />
          <StatCard label="Combo" value={mapEntry.combo ?? 'Unknown'} />
          <StatCard label="Time" value={fnFormatTime(mapEntry.run_time) || 'Unknown'} />

          <div class="span-rows">
            <StatCard
              label="Car"
              value={mapEntry.car_model || 'Unknown'}
              backgroundImage={mapEntry.car_model ? `https://cdn.nohesi.gg/carimages/${mapEntry.car_model}.webp` : null}
            />
          </div>
          <div class="span-rows">
            <StatCard label="Map" value={mapEntry.map || 'Unknown'} />
          </div>
          <StatCard label="Traffic" value={mapEntry.traffic_type || 'Unknown'} />
          <StatCard label="Server" value={mapEntry.server_name || 'Unknown'} />

          <StatCard label="Input" value={fnInputLabel(mapEntry.input)} />
          <div class="span-cols">
            <StatCard label="Date / Time Set" value={fnFormatDateUTC(mapEntry.updated_at) || 'Unknown'} />
          </div>
        </div>
      </div>
    {/each}

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

  .error-card {
    margin-top: 0.75rem;
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: 0.7rem;
    padding: 1.25rem 1.5rem;
  }

  .error-card-title {
    color: var(--color-error, #f87171);
    font-size: 0.95rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .error-card-tips {
    color: var(--color-muted);
    font-size: 0.875rem;
  }

  .error-tips-heading {
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  .error-card-tips ul {
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .error-card-tips a {
    color: #7eb6ff;
    text-decoration: underline;
  }

  .error-card-tips code {
    background: rgba(255, 255, 255, 0.08);
    padding: 0.1em 0.35em;
    border-radius: 3px;
    font-size: 0.85em;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
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

  /* mirrors UserIdentityCard's layout so the placeholder sits exactly where the real card lands */
  .sk-identity-card {
    background: var(--color-card-raised);
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }

  .sk-identity {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    flex: 1 1 0;
    min-width: 0;
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

  .sk-v-divider {
    width: 1px;
    align-self: stretch;
    background: var(--color-border);
    flex-shrink: 0;
  }

  /* mirrors the card's single centered row per map */
  .sk-map-rank {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex: 1 1 0;
    min-width: 0;
  }

  .sk-rank-text {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
    min-width: 0;
  }

  .sk-position-bar {
    width: 80%;
    height: 1rem;
  }

  .sk-tier-bar {
    width: 50%;
    height: 0.85rem;
  }

  .sk-rank-icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    flex-shrink: 0;
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
    margin-bottom: 0.75rem;
    min-width: 320px;
  }

  .profile-section:last-child {
    margin-bottom: 3rem;
  }

  .profile-section :global(.identity-card),
  .profile-section :global(.stat-card) {
    background: var(--color-card-raised);
  }

  /* the map cards now run the full width, since the profile no longer sits beside them */
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
