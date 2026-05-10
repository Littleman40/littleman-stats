<script>
  let { text } = $props();
</script>

<span class="section-label">{text}</span>

<style>
  .section-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-muted);
    margin-bottom: 0.75rem;
  }
</style>
