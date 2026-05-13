<script>
  let {
    placeholder = 'Search...',
    oninput,
  } = $props();

  let inputSearchBarValue = $state('');

  function fnHandleInput() {              // called from the <input> oninput in the template below - fires oninput callback 
    oninput?.(inputSearchBarValue);
  }
</script>

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

  input::placeholder {
    color: var(--color-muted);
  }

  input:focus {
    border-color: #555555;
  }
</style>
