<script>
  let { label, value } = $props();
</script>

<div class="stat-card">
  <span class="label">{label}</span>
  <span class="value">{value}</span>
</div>

<style>
  .stat-card {
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .label {
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-muted);
  }

  .value {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
    word-break: break-word;
  }
</style>
