<script>
  import { page } from '$app/stores';

  const links = [
    { href: '/', label: 'Home' },
    { href: '/user-search', label: 'User Search' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/littleman-timing', label: 'LittleMan Timing' },
    { href: '/faq', label: 'FAQ' }
  ];

  let menuOpen = $state(false);

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function closeMenu() {
    menuOpen = false;
  }
</script>

<nav>
  <div class="nav-inner page-wrapper">
    <a href="/" class="brand" onclick={closeMenu}>LittleMan Stats</a>

    <button class="hamburger" onclick={toggleMenu} aria-label="Toggle menu">
      <span></span>
      <span></span>
      <span></span>
    </button>

    <ul class="nav-links" class:open={menuOpen}>
      {#each links as link}
        <li>
          <a
            href={link.href}
            class:active={$page.url.pathname === link.href}
            onclick={closeMenu}
          >{link.label}</a>
        </li>
      {/each}
    </ul>
  </div>
</nav>

<style>
  nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--navbar-height);
    background: var(--color-bg-alt);
    border-bottom: 1px solid var(--color-border);
    z-index: 100;
  }

  .nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
  }

  .brand {
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--color-text);
    white-space: nowrap;
  }

  .nav-links {
    display: flex;
    list-style: none;
    gap: 1.75rem;
    align-items: center;
  }

  .nav-links a {
    color: var(--color-muted);
    font-size: 0.9rem;
    transition: color 0.15s;
  }

  .nav-links a:hover,
  .nav-links a.active {
    color: var(--color-text);
  }

  .nav-links a.active {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .hamburger {
    display: none;
    flex-direction: column;
    gap: 5px;
    padding: 4px;
  }

  .hamburger span {
    display: block;
    width: 22px;
    height: 2px;
    background: var(--color-text);
    border-radius: 2px;
    transition: opacity 0.15s;
  }

  @media (max-width: 640px) {
    .hamburger {
      display: flex;
    }

    .nav-links {
      display: none;
      position: absolute;
      top: var(--navbar-height);
      left: 0;
      right: 0;
      background: var(--color-bg-alt);
      border-bottom: 1px solid var(--color-border);
      flex-direction: column;
      padding: 1rem var(--page-padding);
      gap: 1rem;
      align-items: flex-start;
    }

    .nav-links.open {
      display: flex;
    }
  }
</style>
