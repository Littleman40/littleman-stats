<script>
  import { page } from '$app/stores';
</script>

<div class="error-container">
  <h1>404</h1>
  <p>The page you were looking for doesn't exist</p>
</div>

<style>
  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: calc(100dvh - var(--navbar-height));
    text-align: center;
  }

  h1 {
    font-size: 5rem;
    font-weight: 700;
    margin: 0;
    color: var(--color-text);
  }

  p {
    font-size: 1.2rem;
    color: var(--color-muted);
    margin: 0;
  }
</style>
