<script>

  // local variables
  let {                                   
    placeholder = 'Search...',
    oninput,
    onsubmit,
    buttonLabel = 'Search'
  } = $props();

  let inputSearchBarValue = $state('');

  function fnHandleInput() {
    oninput?.(inputSearchBarValue);
  }

  function fnHandleSubmit(submitEvent) {
    submitEvent.preventDefault();
    const trimmedValue = inputSearchBarValue.trim();
    if (trimmedValue) {
      onsubmit?.(trimmedValue);
    }
  }
</script>

{#if onsubmit}

  <form class="search-bar with-button" onsubmit={fnHandleSubmit}>
    <input
      type="text"
      bind:value={inputSearchBarValue}
      {placeholder}
      autocomplete="off"
      spellcheck="false"
      oninput={fnHandleInput}
    />
    <button type="submit">{buttonLabel}</button>
  </form>

{:else}

  <div class="search-bar">
    <input
      type="text"
      bind:value={inputSearchBarValue}
      {placeholder}
      autocomplete="off"
      spellcheck="false"
      oninput={fnHandleInput}
    />
  </div>
  
{/if}

<style>
  .search-bar {
    display: flex;
    width: 100%;
  }

  input {
    flex: 1;
    height: 44px;
    padding: 0 1rem;
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-btn);
    color: var(--color-text);
    font-family: inherit;
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.15s;
  }

  .search-bar.with-button input {
    border-right: none;
    border-radius: 0.7rem 0 0 0.7rem;
  }

  input::placeholder {
    color: var(--color-muted);
  }

  input:focus {
    border-color: #555555;
  }

  button {
    height: 44px;
    padding: 0 1.25rem;
    background: var(--color-text);
    color: var(--color-text-on-light);
    font-size: 0.9rem;
    font-weight: 500;
    border-radius: 0 0.7rem 0.7rem 0;
    transition: opacity 0.15s;
    white-space: nowrap;
  }

  button:hover {
    opacity: 0.88;
  }
</style>
