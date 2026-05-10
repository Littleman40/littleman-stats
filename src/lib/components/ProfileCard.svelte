<script>
  let { nohesi_pfp, nohesi_name, tier_name, rank_position } = $props();
</script>

<div class="profile-card">
  <div class="avatar-wrap">
    {#if nohesi_pfp}
      <img src={nohesi_pfp} alt="{nohesi_name} avatar" class="avatar" />
    {:else}
      <div class="avatar-placeholder"></div>
    {/if}
  </div>
  <div class="info">
    <span class="name">{nohesi_name}</span>
    <span class="tier">{tier_name}</span>
    <span class="rank">#{rank_position}</span>
  </div>
</div>

<style>
  .profile-card {
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
  }

  .avatar-wrap {
    width: 88px;
    height: 88px;
  }

  .avatar,
  .avatar-placeholder {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    border: 2px solid var(--color-border);
    object-fit: cover;
  }

  .avatar-placeholder {
    background: var(--color-card-raised);
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .name {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .tier {
    font-size: 0.85rem;
    color: var(--color-muted);
  }

  .rank {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text);
  }
</style>
