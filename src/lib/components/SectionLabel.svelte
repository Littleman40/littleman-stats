<script>
  let {               // local variable - as an fyi, this page is only used in the run history part of our website
    text
    } = $props();
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
    margin-top: 1rem;
    margin-bottom: 0.01rem;
  }
</style>
