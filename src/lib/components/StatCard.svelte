<script>
  let {                                             // local variables
    label, 
    value, 
    backgroundImage = null 
    } = $props();
</script>

<div class="stat-card" class:has-bg={!!backgroundImage}>
  {#if backgroundImage}
    <!-- car/photo background lives on its own layer so the dark gradient overlay above it can keep the label + value readable -->
    <div class="bg-image" style="background-image: url('{backgroundImage}')"></div>
    <div class="bg-overlay"></div>
  {/if}
  <span class="label">{label}</span>
  <span class="value">{value}</span>
</div>

<style>
  .stat-card {
    position: relative;
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    overflow: hidden;
  }

  .bg-image {
    position: absolute;
    inset: 0;
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
    z-index: 0;
  }

  .bg-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.75) 100%);
    z-index: 1;
  }

  .label,
  .value {
    position: relative;
    z-index: 2;
  }

  .label {
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-muted);
  }

  .stat-card.has-bg .label {
    color: rgba(255, 255, 255, 0.85);
  }

  .value {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
    word-break: break-word;
  }
</style>
