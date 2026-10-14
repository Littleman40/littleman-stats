<script>
  import { onMount } from 'svelte';
  import PaginationControls from '$lib/components/PaginationControls.svelte';

  const FLEET_API = 'https://api.nohesi.gg/fleet';

  // live player counts refresh this often (the fleet api caches for 10s so faster is pointless)
  const REFRESH_INTERVAL_MS = 30 * 1000;

  const SERVERS_PER_PAGE = 15;

  const OFFICIAL_SERVERS_URL = 'https://nohesi.gg/servers';
  const CONTACT_EMAIL = 'inquiries@littleman.dev';
  const DISCLAIMER_STORAGE_KEY = 'servers-disclaimer-dismissed';

  // the disclaimer shows on every visit unless the user ticked "don't show again"
  let showDisclaimer = $state(false);
  let dontShowAgain = $state(false);

  // car lists come from static/cars.json, scraped by the github action every 6 hours
  let carData = $state(null);
  let officialServers = $state([]);
  let customServers = $state([]);
  let isLoading = $state(true);
  let loadError = $state(null);

  let selectedCars = $state([]);
  let carQuery = $state('');
  let selectedRegions = $state([]);
  let selectedTypes = $state([]);
  let selectedExperiences = $state([]);
  let searchText = $state('');
  let mustHaveAll = $state(true);
  let currentPage = $state(1);

  // which filter card is expanded, only one at a time
  let openCard = $state(null);

  // official servers: live fleet data joined with the scraped car lists
  async function fnLoadOfficialServers() {
    const experiencesResponse = await fetch(FLEET_API + '/experiences');
    if (!experiencesResponse.ok) throw new Error('Could not load the server list');
    const { experiences } = await experiencesResponse.json();

    const perExperience = await Promise.all(experiences.map(async (experience) => {
      const response = await fetch(FLEET_API + '/experiences/' + encodeURIComponent(experience.id) + '/shards');
      if (!response.ok) return [];
      const { shards } = await response.json();

      return shards.map((shard) => {
        const scraped = carData?.servers[shard.endpoint];
        return {
          endpoint: shard.endpoint,
          name: shard.name.replace(/^No Hesi \| /, '').replace(/ \| discord\.gg\/nohesitation/, ''),
          region: shard.region,
          type: 'public',
          experience: experience.displayName,
          players: shard.players,
          maxPlayers: shard.maxClients,

          // shards spun up since the last scrape have no entry yet, so use their experience's car list
          cars: scraped?.cars ?? carData?.experienceCars[experience.id] ?? []
        };
      });
    }));

    return perExperience.flat();
  }

  // community servers come through our own proxy because the catalog has no cors
  async function fnLoadCustomServers() {
    try {
      const response = await fetch('/api/custom-servers');
      if (!response.ok) return [];
      const { servers } = await response.json();
      return servers.map((server) => ({ ...server, type: 'custom', experience: null }));
    } catch {
      return [];
    }
  }

  async function fnRefresh() {
    try {
      const [official, custom] = await Promise.all([fnLoadOfficialServers(), fnLoadCustomServers()]);
      officialServers = official;
      customServers = custom;
      loadError = null;
    } catch (error) {
      loadError = error.message;
    } finally {
      isLoading = false;
    }
  }

  function fnCloseDisclaimer() {
    showDisclaimer = false;
    if (!dontShowAgain) return;
    try {
      localStorage.setItem(DISCLAIMER_STORAGE_KEY, '1');
    } catch {
      // storage can be blocked, in which case it just shows again next time
    }
  }

  onMount(() => {
    try {
      showDisclaimer = localStorage.getItem(DISCLAIMER_STORAGE_KEY) !== '1';
    } catch {
      showDisclaimer = true;
    }

    let timer;
    (async () => {
      try {
        const response = await fetch('/cars.json');
        if (response.ok) carData = await response.json();
      } catch {
        // the page still works without car data, it just can't filter by car
      }
      await fnRefresh();
      timer = setInterval(fnRefresh, REFRESH_INTERVAL_MS);
    })();
    return () => clearInterval(timer);
  });

  const allServers = $derived(
    [...officialServers, ...customServers].sort((a, b) => b.players - a.players)
  );

  const experiences = $derived(
    [...new Set(officialServers.map((server) => server.experience))].sort()
  );

  const regions = $derived([...new Set(allServers.map((server) => server.region))].sort());

  // the car picker list, narrowed by what has been typed
  const carMatches = $derived(
    (carData?.cars ?? [])
      .filter((car) => car.model.toLowerCase().includes(carQuery.toLowerCase()))
      .slice(0, 60)
  );

  const filteredServers = $derived(
    allServers.filter((server) => {
      // no regions selected means all regions
      if (selectedRegions.length && !selectedRegions.includes(server.region)) return false;
      // types and experiences each mean "any of these", nothing selected means no restriction
      if (selectedTypes.length && !selectedTypes.includes(server.type)) return false;
      if (selectedExperiences.length && !selectedExperiences.includes(server.experience)) return false;
      if (searchText && !server.name.toLowerCase().includes(searchText.trim().toLowerCase())) return false;
      if (selectedCars.length) {
        const hasCar = (model) => server.cars.includes(model);
        return mustHaveAll ? selectedCars.every(hasCar) : selectedCars.some(hasCar);
      }
      return true;
    })
  );

  const totalPages = $derived(Math.max(1, Math.ceil(filteredServers.length / SERVERS_PER_PAGE)));

  const pageServers = $derived(
    filteredServers.slice((currentPage - 1) * SERVERS_PER_PAGE, currentPage * SERVERS_PER_PAGE)
  );

  // any filter change goes back to page one
  $effect(() => {
    selectedRegions; selectedTypes; selectedExperiences; searchText; selectedCars; mustHaveAll;
    currentPage = 1;
  });

  // a shrinking list (live refresh) can't leave us past the last page
  $effect(() => {
    if (currentPage > totalPages) currentPage = totalPages;
  });

  // clicking anywhere outside an open popup (or its button) closes it
  function fnHandleWindowClick(clickEvent) {
    if (!clickEvent.target.closest('.dropdown, .card-head')) openCard = null;
  }

  // the endpoint is "ip:httpPort", which is exactly what the join page wants
  function fnBuildJoinUrl(endpoint) {
    const [ip, httpPort] = endpoint.split(':');
    return 'https://acstuff.ru/s/q:race/online/join?ip=' + encodeURIComponent(ip) + '&httpPort=' + encodeURIComponent(httpPort);
  }

  function fnToggleCard(cardName) {
    openCard = openCard === cardName ? null : cardName;
  }

  function fnToggleRegion(region) {
    selectedRegions = selectedRegions.includes(region)
      ? selectedRegions.filter((selected) => selected !== region)
      : [...selectedRegions, region];
  }

  function fnToggleType(type) {
    selectedTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((selected) => selected !== type)
      : [...selectedTypes, type];
  }

  function fnToggleExperience(experience) {
    selectedExperiences = selectedExperiences.includes(experience)
      ? selectedExperiences.filter((selected) => selected !== experience)
      : [...selectedExperiences, experience];
  }

  function fnToggleCar(model) {
    selectedCars = selectedCars.includes(model)
      ? selectedCars.filter((selected) => selected !== model)
      : [...selectedCars, model];
  }

  function fnResetFilters() {
    selectedRegions = [];
    selectedTypes = [];
    selectedExperiences = [];
    searchText = '';
    selectedCars = [];
    carQuery = '';
    openCard = null;
  }
</script>

<svelte:window onclick={fnHandleWindowClick} onkeydown={(keyEvent) => keyEvent.key === 'Escape' && (openCard = null)} />

<svelte:head>
  <title>Server Search - LittleMan Stats</title>
</svelte:head>

{#if showDisclaimer}
  <div class="modal-backdrop">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
      <h2 id="disclaimer-title">Please Note</h2>
      <p>
        This is an unofficial project. It is not affiliated with or associated with No Hesi, and it only uses publicly available APIs.
      </p>
      <p>
        The official No Hesi server list can be found
        <a class="text-link" href={OFFICIAL_SERVERS_URL} target="_blank" rel="noopener noreferrer">here</a>.
      </p>
      <p>
        If No Hesi would like this taken down, please reach out to me at
        <a class="text-link" href={'mailto:' + CONTACT_EMAIL}>{CONTACT_EMAIL}</a>.
      </p>

      <button class="option" class:active={dontShowAgain} onclick={() => (dontShowAgain = !dontShowAgain)}>
        <span class="check"></span>Don't show this again
      </button>

      <button class="modal-btn" onclick={fnCloseDisclaimer}>I understand</button>
    </div>
  </div>
{/if}

<div class="page page-wrapper">
  <div class="page-header">
    <h1>Server Search</h1>
    <p>Find No Hesi servers through filters. The official server list can be found <a class="text-link" href={OFFICIAL_SERVERS_URL} target="_blank" rel="noopener noreferrer">here</a>.</p>
  </div>

  <div class="filter-bar">

    <!-- the search card is always open so you can type straight away, the others open their options when clicked -->
    <div class="group search-group">
      <span class="group-label">Search:</span>
      <input type="search" placeholder="Server name..." bind:value={searchText} />
    </div>

    <div class="group">
      <button class="card-head" class:open={openCard === 'cars'} onclick={() => fnToggleCard('cars')} aria-expanded={openCard === 'cars'}>
        <span class="group-label">Filter By Car</span>
        {#if selectedCars.length}<span class="badge">{selectedCars.length}</span>{/if}
        <span class="chevron"></span>
      </button>
      {#if openCard === 'cars'}
        <div class="dropdown car-dropdown">
          <input type="search" placeholder="Search {carData?.cars.length ?? ''} cars..." bind:value={carQuery} />
          <div class="option-scroll car-scroll">
            {#each carMatches as car (car.model)}
              <button class="option" class:active={selectedCars.includes(car.model)} onclick={() => fnToggleCar(car.model)}>
                <span class="check"></span>{car.model}
              </button>
            {:else}
              <span class="muted empty-note">{carData ? 'No cars found' : 'Car data unavailable'}</span>
            {/each}
          </div>
          {#if selectedCars.length > 1}
            <button class="option match-all" class:active={mustHaveAll} onclick={() => (mustHaveAll = !mustHaveAll)}>
              <span class="check"></span>Must have all selected cars
            </button>
          {/if}
        </div>
      {/if}
    </div>

    <div class="group">
      <button class="card-head" class:open={openCard === 'region'} onclick={() => fnToggleCard('region')} aria-expanded={openCard === 'region'}>
        <span class="group-label">Filter By Region</span>
        {#if selectedRegions.length}<span class="badge">{selectedRegions.length}</span>{/if}
        <span class="chevron"></span>
      </button>
      {#if openCard === 'region'}
        <div class="dropdown option-list">
          <div class="option-scroll">
            {#each regions as region}
              <button class="option" class:active={selectedRegions.includes(region)} onclick={() => fnToggleRegion(region)}><span class="check"></span>{region}</button>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <div class="group">
      <button class="card-head" class:open={openCard === 'type'} onclick={() => fnToggleCard('type')} aria-expanded={openCard === 'type'}>
        <span class="group-label">Filter By Server Type</span>
        {#if selectedTypes.length + selectedExperiences.length}<span class="badge">{selectedTypes.length + selectedExperiences.length}</span>{/if}
        <span class="chevron"></span>
      </button>
      {#if openCard === 'type'}
        <div class="dropdown option-list">
          <div class="option-scroll">
          <button class="option" class:active={selectedTypes.includes('public')} onclick={() => fnToggleType('public')}><span class="check"></span>Public Servers</button>
          <button class="option" class:active={selectedTypes.includes('custom')} onclick={() => fnToggleType('custom')}><span class="check"></span>Custom Servers</button>
          <span class="list-heading">Experience</span>
          {#each experiences as experience}
            <button class="option" class:active={selectedExperiences.includes(experience)} onclick={() => fnToggleExperience(experience)}><span class="check"></span>{experience}</button>
          {/each}
          </div>
        </div>
      {/if}
    </div>

    <button class="reset-btn" onclick={fnResetFilters} aria-label="Reset filters">
      <img src="/img/cross.svg" width="14" height="14" alt="" style="filter: invert(1)" />
    </button>
  </div>

  {#if isLoading}
    <p class="muted">Loading servers...</p>
  {:else if loadError}
    <p class="error">{loadError}</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Server</th><th>Region</th><th>Players</th></tr>
        </thead>
        <tbody>
          {#each pageServers as server (server.endpoint)}
            <tr>
              <!-- every cell holds the same link so the whole row is clickable and opens in a new tab -->
              <td><a class="row-link" href={fnBuildJoinUrl(server.endpoint)} target="_blank" rel="noopener noreferrer">{server.name}</a></td>
              <td><a class="row-link" href={fnBuildJoinUrl(server.endpoint)} target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true">{server.region}</a></td>
              <td class="mono"><a class="row-link" href={fnBuildJoinUrl(server.endpoint)} target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true">{server.players}/{server.maxPlayers}</a></td>
            </tr>
          {:else}
            <tr><td colspan="3" class="muted">No servers match these filters.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>

    <PaginationControls
      page={currentPage}
      {totalPages}
      hasNext={currentPage < totalPages}
      hasPrev={currentPage > 1}
      onprev={() => currentPage--}
      onnext={() => currentPage++}
      onjump={(pageNumber) => (currentPage = pageNumber)}
    />
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
    margin-bottom: 0.4rem;
  }

  .page-header p,
  .muted {
    color: var(--color-muted);
    font-size: 0.95rem;
  }

  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  /* same rounded card look as the leaderboard filter bar */
  .group {
    position: relative;
    border: 1px solid var(--color-border);
    border-radius: 0.7rem;
    background: var(--color-card-elevated);
  }

  .card-head {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    height: 2.75rem;
    padding: 0 1.1rem 0 0.9rem;
    color: var(--color-text);
    font-size: 0.85rem;
    border-radius: 0.7rem;
  }

  .group-label {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-muted);
    white-space: nowrap;
  }

  .search-group {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    height: calc(2.75rem + 2px);
    padding: 0 1.1rem 0 0.9rem;
  }

  .search-group input[type='search'] {
    width: 12rem;
    min-width: 0;
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    font-size: 0.85rem;
    height: 1.5rem;
    line-height: 1.5rem;
  }

  .badge {
    min-width: 1.3rem;
    padding: 0 0.4rem;
    border-radius: 0.4rem;
    background: var(--color-text);
    color: var(--color-text-on-light);
    font-size: 0.75rem;
    font-weight: 700;
    text-align: center;
  }

  .option-list {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 15rem;
  }

  .option-scroll {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    max-height: 20rem;
    overflow-y: auto;
    padding-right: 0.3rem;
  }

  @supports not selector(::-webkit-scrollbar) {
    .option-scroll {
      scrollbar-width: thin;
      scrollbar-color: #444444 transparent;
    }
  }

  .option-scroll::-webkit-scrollbar {
    width: 6px;
  }

  /* hides the little up / down arrow buttons */
  .option-scroll::-webkit-scrollbar-button {
    display: none;
  }

  .option-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .option-scroll::-webkit-scrollbar-thumb {
    background: #444444;
    border-radius: 0.4rem;
  }

  .option-scroll::-webkit-scrollbar-thumb:hover {
    background: #666666;
  }

  .option {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    width: 100%;
    padding: 0.65rem 0.8rem;
    border-radius: 0.5rem;
    color: var(--color-muted);
    font-size: 0.95rem;
    text-align: left;
    transition: background 0.15s, color 0.15s;
  }

  .option:hover {
    color: var(--color-text);
    background: var(--color-card-raised);
  }

  .option.active {
    color: var(--color-text);
    background: var(--color-card-raised);
  }

  /* tick box on the left of every option */
  .check {
    position: relative;
    flex-shrink: 0;
    width: 1.15rem;
    height: 1.15rem;
    border: 1.5px solid #555555;
    border-radius: 0.35rem;
    transition: background 0.15s, border-color 0.15s;
  }

  .option:hover .check {
    border-color: var(--color-text);
  }

  .option.active .check {
    background: var(--color-text);
    border-color: var(--color-text);
  }

  .option.active .check::after {
    content: '';
    position: absolute;
    inset: 0;
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 8.5l2.6 2.6L12 5.6' fill='none' stroke='%23111111' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 80% no-repeat;
  }

  .list-heading {
    margin: 0.4rem 0.8rem 0.1rem;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-muted);
  }

  .chevron {
    width: 0.45rem;
    height: 0.45rem;
    border-right: 2px solid var(--color-muted);
    border-bottom: 2px solid var(--color-muted);
    transform: rotate(45deg) translate(-2px, -2px);
    transition: transform 0.15s;
  }

  .card-head.open .chevron {
    transform: rotate(-135deg);
  }

  /* the options only show once a card is clicked */
  .dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    z-index: 20;
    min-width: 100%;
    width: max-content;
    max-width: min(26rem, 90vw);
    padding: 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 0.7rem;
    background: var(--color-card-elevated);
  }

  input[type='search'] {
    width: 100%;
    min-width: 14rem;
    padding: 0.65rem 0.9rem;
    background: var(--color-card-raised);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-family: inherit;
    font-size: 0.95rem;
    outline: none;
    color-scheme: dark;
  }

  input[type='search']:focus {
    border-color: #555555;
  }

  .car-dropdown {
    width: 26rem;
  }

  .car-scroll {
    max-height: 20rem;
    margin-top: 0.5rem;
  }

  .match-all {
    margin-top: 0.4rem;
    border-top: 1px solid var(--color-border);
    border-radius: 0 0 0.5rem 0.5rem;
    padding-top: 0.8rem;
  }

  .empty-note {
    padding: 0.65rem 0.8rem;
  }

  .reset-btn {
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 0.7rem;
    border: 1px solid var(--color-border);
    background: var(--color-card-elevated);
    transition: border-color 0.15s;
    flex-shrink: 0;
  }

  .reset-btn:hover {
    border-color: #555555;
  }

  .error {
    color: var(--color-error);
  }

  .table-wrap {
    border: 1px solid var(--color-border);
    border-radius: 0.7rem;
    overflow-x: auto;
    color-scheme: dark;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    text-align: left;
    padding: 1.05rem 0.9rem;
  }

  /* the link fills the whole cell, so the padding moves onto it */
  tbody td:has(.row-link) {
    padding: 0;
  }

  .row-link {
    display: block;
    padding: 1.05rem 0.9rem;
  }

  tbody tr:has(.row-link):hover {
    background: var(--color-card-raised);
  }

  .text-link {
    color: var(--color-text);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: rgba(0, 0, 0, 0.7);
  }

  .modal {
    width: 100%;
    max-width: 30rem;
    padding: 1.5rem;
    border: 1px solid var(--color-border);
    border-radius: 0.7rem;
    background: var(--color-card-elevated);
  }

  .modal h2 {
    margin-bottom: 0.8rem;
    font-size: 1.25rem;
  }

  .modal p {
    margin-bottom: 0.8rem;
    color: var(--color-muted);
    font-size: 0.95rem;
  }

  /* no grey background on hover or when ticked here, just the tick box and text */
  .modal .option {
    width: auto;
    margin-bottom: 0.5rem;
    padding-left: 0;
  }

  .modal .option:hover,
  .modal .option.active {
    background: transparent;
  }

  .modal-btn {
    width: 100%;
    padding: 0.75rem;
    border-radius: 0.7rem;
    background: var(--color-text);
    color: var(--color-text-on-light);
    font-size: 0.95rem;
    font-weight: 700;
  }

  th {
    padding: 0.5rem 0.9rem;
    font-size: 0.8rem;
  }

  thead tr {
    border-bottom: 1px solid var(--color-border);
  }

  tbody tr:nth-child(odd) {
    background: var(--color-card);
  }

  tbody tr:nth-child(even) {
    background: var(--color-card-elevated);
  }

  .mono {
    font-variant-numeric: tabular-nums;
  }
</style>
