<script>
  let {                                  // local variables
    nohesi_pfp, 
    nohesi_name, 
    steam_id, 
    rank_position, 
    tier_name, 
    mode, 
    team_names 
  } = $props();

  const rankIconUrl = $derived(          // builds the rank-icon url from the tier name
    tier_name
      ? `https://cdn.nohesi.gg/images/rankicons/${tier_name.toLowerCase().replace(/\s+/g, '_')}.svg`
      : null
  );

  const showTeamSection = $derived(mode === 'team' && Array.isArray(team_names) && team_names.length > 0);
</script>

<div class="profile-card">
  <div class="identity">      <!-- top section of profile card -->
    <div class="avatar-wrap">
      {#if nohesi_pfp}
        <img src={nohesi_pfp} alt="{nohesi_name} avatar" class="avatar" />
      {:else}
        <div class="avatar-placeholder"></div>
      {/if}
    </div>
    <div class="name-block">
      <span class="name">{nohesi_name ?? '-'}</span>
      <span class="steam-id">{steam_id ?? '-'}</span>
    </div>
  </div>

  <div class="divider"></div>

  <div class="stat-rows">   <!-- bottom section of profile card -->
    <div class="stat-row">
      <span class="stat-label">Position</span>
      <span class="stat-value">{rank_position != null ? `#${rank_position}` : '-'}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Rank</span>
      <span class="stat-value rank-value">
        <span>{tier_name ?? '-'}</span>
        {#if rankIconUrl && showTeamSection}
          <!-- for crew pbs, keep the icon inline so the team list fits -->
          <img src={rankIconUrl} alt="{tier_name} rank icon" class="rank-icon-inline" />
        {/if}
      </span>
    </div>
  </div>

  <!-- for solo pbs show the big rank icon below -->
  {#if rankIconUrl && !showTeamSection}
    <div class="rank-icon-wrap">
      <img src={rankIconUrl} alt="{tier_name} rank icon" class="rank-icon-large" />
    </div>
  {/if}

  <!-- team members section - for crew runs -->
  {#if showTeamSection}
    <div class="divider"></div>
    <div class="team-section">
      <span class="team-heading">Team Members</span>
      <ul class="team-list">
        {#each team_names as teammateName}
          <li>{teammateName}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .profile-card {
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    padding: 1.25rem;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .identity {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }

  .avatar-wrap {
    flex-shrink: 0;
    width: 52px;
    height: 52px;
  }

  .avatar,
  .avatar-placeholder {
    width: 52px;
    height: 52px;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    object-fit: cover;
    display: block;
  }

  .avatar-placeholder {
    background: var(--color-card);
  }

  .name-block {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  .name {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .steam-id {
    font-size: 0.75rem;
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .divider {
    height: 1px;
    background: var(--color-border);
  }

  .stat-rows {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
  }

  .stat-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
    white-space: nowrap;
  }

  .stat-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
    text-align: right;
  }

  .rank-value {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .rank-icon-inline {
    width: 18px;
    height: 18px;
    object-fit: contain;
  }

  .rank-icon-wrap {
    display: flex;
    justify-content: center;
    padding-top: 0.25rem;
  }

  .rank-icon-large {
    width: 64px;
    height: 64px;
    object-fit: contain;
  }

  .team-section {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .team-heading {
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-muted);
  }

  .team-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    overflow-y: auto;
    min-height: 0;
  }

  .team-list li {
    font-size: 0.875rem;
    color: var(--color-text);
  }
</style>
