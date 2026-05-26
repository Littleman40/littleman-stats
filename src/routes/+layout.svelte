<script>
  import '../app.css';                                              // global styles, design tokens, and base resets applied to the whole site
  import Navbar from '$lib/components/Navbar.svelte';               // top navigation bar shown on every page
  import Footer from '$lib/components/Footer.svelte';               // bottom footer shown on every page

  let { children } = $props();                                      // the current page's content, passed in by SvelteKit's router
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
