<script>
  let { placeholder = 'Search...', onsubmit, buttonLabel = 'Search' } = $props();

  let value = $state('');

  function handleSubmit(e) {
    e.preventDefault();
    if (value.trim()) {
      onsubmit?.(value.trim());
    }
  }
</script>

<form class="search-bar" onsubmit={handleSubmit}>
  <input
    type="text"
    bind:value
    {placeholder}
    autocomplete="off"
    spellcheck="false"
  />
  <button type="submit">{buttonLabel}</button>
</form>

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
    border-right: none;
    border-radius: var(--radius-btn) 0 0 var(--radius-btn);
    color: var(--color-text);
    font-family: inherit;
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.15s;
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
    border-radius: 0 var(--radius-btn) var(--radius-btn) 0;
    transition: opacity 0.15s;
    white-space: nowrap;
  }

  button:hover {
    opacity: 0.88;
  }
</style>
