<script>
  let {
    page: currentPageNumber = 1,
    totalPages: totalPageCount,
    hasNext: canGoNext = false,
    hasPrev: canGoPrev = false,
    onprev,
    onnext,
    onjump,
  } = $props();

  let jumpInputValue = $state('');

  function fnHandleJumpSubmit(submitEvent) { // called from the jump-form onsubmit in the template below
    submitEvent.preventDefault();
    const requestedPageNumber = parseInt(jumpInputValue, 10);
    if (!Number.isFinite(requestedPageNumber) || requestedPageNumber < 1) return;
    if (totalPageCount != null && requestedPageNumber > totalPageCount) return;
    onjump?.(requestedPageNumber);
    jumpInputValue = '';
  }
</script>

<div class="pagination-box">
  <div class="pagination">
    <button
      class="btn"
      disabled={!canGoPrev}
      onclick={() => onprev?.()}
    >← Prev</button>

    <span class="page-indicator">

      {#if totalPageCount != null}Page {currentPageNumber} of {totalPageCount}{:else}Page {currentPageNumber}{/if}
    </span>

    <button
      class="btn"
      disabled={!canGoNext}
      onclick={() => onnext?.()}
    >Next →</button>

    {#if onjump && totalPageCount != null && totalPageCount > 1}
      <form class="jump" onsubmit={fnHandleJumpSubmit}>
        <label class="jump-label" for="page-jump">Go to</label>
        <input
          id="page-jump"
          type="number"
          min="1"
          max={totalPageCount}
          bind:value={jumpInputValue}
          placeholder="#"
        />
        <button class="btn" type="submit" disabled={!jumpInputValue}>Go</button>
      </form>
    {/if}
  </div>
</div>

<style>
  .pagination-box {
    margin-top: 1.5rem;
    padding: 0.75rem 1rem;
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-btn);
    display: inline-flex;
  }

  .pagination {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
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
    white-space: nowrap;
  }

  .jump {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: 0.5rem;
  }

  .jump-label {
    color: var(--color-muted);
    font-size: 0.85rem;
  }

  .jump input {
    width: 64px;
    height: 32px;
    padding: 0 0.5rem;
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-btn);
    color: var(--color-text);
    font-family: inherit;
    font-size: 0.85rem;
    outline: none;
    text-align: center;
  }

  .jump input:focus {
    border-color: #555555;
  }

  .jump input::-webkit-outer-spin-button,
  .jump input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .jump input[type='number'] {
    -moz-appearance: textfield;
    appearance: textfield;
  }
</style>
