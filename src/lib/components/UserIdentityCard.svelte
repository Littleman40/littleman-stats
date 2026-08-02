<script>
  // local variables - maps holds an entry for every map, including ones the player has no run on
  let {
    nohesi_pfp,
    nohesi_name,
    steam_id,
    maps: mapEntries = []
  } = $props();

  // builds the rank-icon url from the tier name
  function fnBuildRankIconUrl(tierName) {
    if (!tierName) return null;
    return `https://cdn.nohesi.gg/images/rankicons/${tierName.toLowerCase().replace(/\s+/g, '_')}.svg`;
  }
</script>

<div class="identity-card">

  <!-- who the player is, shown once for all three boards -->
  <div class="identity">
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

  <!-- one section per map, kept even when the player has no run there so the card always has the same three slots -->
  {#each mapEntries as mapEntry}

    <div class="v-divider"></div>

    <div class="map-rank">

      <div class="rank-text">
        <span class="position">{mapEntry.label} Position: {mapEntry.rank_position != null ? `#${mapEntry.rank_position}` : '-'}</span>
        <span class="tier">{mapEntry.tier_name ?? '-'}</span>
      </div>

      <!-- fixed size slot either way, so every section lines up whether or not there's an icon -->
      <div class="rank-icon-slot">
        {#if fnBuildRankIconUrl(mapEntry.tier_name)}
          <img src={fnBuildRankIconUrl(mapEntry.tier_name)} alt="{mapEntry.tier_name} rank icon" class="rank-icon" />
        {/if}
      </div>

    </div>

  {/each}
</div>

<style>
  .identity-card {
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }

  .identity {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    flex: 1 1 0;
    min-width: 0;
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

  .v-divider {
    width: 1px;
    align-self: stretch;
    background: var(--color-border);
    flex-shrink: 0;
  }

  /* one row per map, so the rank icon centers against both lines of text */
  .map-rank {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex: 1 1 0;
    min-width: 0;
  }

  .rank-text {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  .position {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tier {
    font-size: 0.85rem;
    color: var(--color-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rank-icon-slot {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .rank-icon {
    width: 44px;
    height: 44px;
    object-fit: contain;
  }

  /* stacks into rows once there isn't room for four columns side by side */
  @media (max-width: 900px) {
    .identity-card {
      flex-direction: column;
      align-items: stretch;
      gap: 0.875rem;
    }

    .v-divider {
      width: auto;
      height: 1px;
      align-self: auto;
    }
  }
</style>
