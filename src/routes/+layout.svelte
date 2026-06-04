<script>
  import '../app.css';
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';

  // the current page's content, passed in by SvelteKit's router
  let { children } = $props();
</script>

<Navbar />

<main>
  {@render children()}
</main>

<Footer />

<style>
  main {
    flex: 1;
    padding-top: var(--navbar-height);
    display: flex;
    flex-direction: column;
  }
</style>
