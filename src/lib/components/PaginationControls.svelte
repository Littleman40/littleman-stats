<script>
  let { page = 1, hasNext = false, hasPrev = false, onprev, onnext } = $props();
</script>

<div class="pagination">
  <button
    class="btn"
    disabled={!hasPrev}
    onclick={() => onprev?.()}
  >← Prev</button>

  <span class="page-indicator">Page {page}</span>

  <button
    class="btn"
    disabled={!hasNext}
    onclick={() => onnext?.()}
  >Next →</button>
</div>

<style>
  .pagination {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 0;
  }

  .btn {
    padding: 0.5rem 1rem;
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-btn);
    color: var(--color-text);
    font-family: inherit;
    font-size: 0.875rem;
    cursor: pointer;
    transition: border-color 0.15s, opacity 0.15s;
  }

  .btn:hover:not(:disabled) {
    border-color: #555555;
  }

  .btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .page-indicator {
    color: var(--color-muted);
    font-size: 0.875rem;
    min-width: 60px;
    text-align: center;
  }
</style>
