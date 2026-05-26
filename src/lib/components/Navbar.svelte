<script>
  import { page } from '$app/stores';             // used to compare the current URL pathname against each nav link to highlight the active one

  const navLinks = [                              // navigation links
    { href: '/', label: 'Home' },
    { href: '/user-search', label: 'User Search' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/ranks', label: 'Ranks' },
    { href: '/faq', label: 'FAQ' }
  ];

  let isMobileMenuOpen = $state(false);

  function fnToggleMobileMenu() {                 // called from the hamburger button onclick in the template below
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  function fnCloseMobileMenu() {                  // called from the brand link + each nav link onclick in the template below
    isMobileMenuOpen = false;
  }

  $effect(() => {                                 // auto-close the dropdown when the viewport widens past the hamburger breakpoint
    if (typeof window === 'undefined') return;    // stops the code being run on the server
    const mediaQuery = window.matchMedia('(min-width: 761px)');
    function fnHandleViewportChange(event) {
      if (event.matches) isMobileMenuOpen = false;
    }
    mediaQuery.addEventListener('change', fnHandleViewportChange);
    return () => mediaQuery.removeEventListener('change', fnHandleViewportChange);  //remove the listener when the navbar is destroyed
  });
</script>

<div class="nav-wrap">
  <nav class="nav-pill">
    <a href="/" class="brand" onclick={fnCloseMobileMenu}>LittleMan Stats</a>

    <ul class="nav-links">
      {#each navLinks as navLinkObj}                          <!-- desktop nav links -->
        <li>
          <a
            href={navLinkObj.href}
            class:active={$page.url.pathname === navLinkObj.href}
            onclick={fnCloseMobileMenu}
          >{navLinkObj.label}</a>
        </li>
      {/each}
    </ul>

    <button
      class="hamburger"
      class:open={isMobileMenuOpen}
      onclick={fnToggleMobileMenu}
      aria-label="Toggle menu"
      aria-expanded={isMobileMenuOpen}
    >
      <span></span>
      <span></span>
      <span></span>
    </button>
  </nav>

  {#if isMobileMenuOpen}
    <div class="mobile-menu">
      <ul>
        {#each navLinks as navLinkObj}                        <!-- mobile dropdown links -->
          <li>
            <a
              href={navLinkObj.href}
              class:active={$page.url.pathname === navLinkObj.href}
              onclick={fnCloseMobileMenu}
            >{navLinkObj.label}</a>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .nav-wrap {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;                          /* let clicks pass through the empty space around the pill */
    padding: 0.85rem var(--page-padding) 0;
  }
  .nav-pill {
    pointer-events: auto;
    width: 100%;
    max-width: 1216px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    padding: 0.7rem 2.1rem;
    background: rgb(from var(--color-text) r g b / 0.75);
    backdrop-filter: blur(16px) saturate(160%);
    -webkit-backdrop-filter: blur(16px) saturate(80%);
    border: 1px solid rgb(44, 44, 44);
    border-radius: var(--radius-pill);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35), 0 1px 2px rgba(0, 0, 0, 0.15);
    color: var(--color-text-on-light);
  }

  .brand {
    font-weight: 700;
    font-size: 1.3rem;
    color: var(--color-text-on-light);
    white-space: nowrap;
    letter-spacing: -0.01em;
  }

  .nav-links {
    display: flex;
    list-style: none;
    gap: 2.25rem;
    align-items: center;
    transition: opacity 0.3s ease;
  }

  .nav-links a {
    position: relative;
    color: rgba(17, 17, 17, 0.7);
    font-size: 1.05rem;
    font-weight: 500;
    padding: 0.25rem 0;
    transition: color 0.15s;
  }

  .nav-links a::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0px;
    height: 2px;
    background: currentColor;
    border-radius: 2px;
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform 0.25s ease;
  }

  .nav-links a:hover {
    color: var(--color-text-on-light);
  }

  .nav-links a:hover::after,
  .nav-links a.active::after {
    transform: scaleX(1);
  }

  .nav-links a.active {
    color: var(--color-text-on-light);
  }

  .hamburger {
    display: none;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 5px;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-pill);
    background: #888888;
    transition: background 0.15s;
    border: 1px solid rgb(44, 44, 44);
  }

  .hamburger span {
    display: block;
    width: 22px;
    height: 2px;
    background: var(--color-text-on-light);
    border-radius: 2px;
  }

  .mobile-menu {
    pointer-events: auto;
    width: 100%;
    max-width: 1180px;
    margin-top: 0.6rem;
    padding: 0.5rem;
    background: rgb(from var(--color-text) r g b / 0.75);
    backdrop-filter: blur(16px) saturate(160%);
    -webkit-backdrop-filter: blur(16px) saturate(160%);
    border: 1px solid rgb(44, 44, 44);
    border-radius: 15px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  }

  .mobile-menu ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .mobile-menu a {
    display: block;
    padding: 0.85rem 1.15rem;
    border-radius: 10px;
    color: rgba(17, 17, 17, 0.78);
    font-size: 1.05rem;
    font-weight: 500;
    transition: background 0.15s, color 0.15s;
  }

  .mobile-menu a:hover {
    background: rgba(0, 0, 0, 0.06);
    color: var(--color-text-on-light);
  }

  .mobile-menu a.active {
    background: rgba(0, 0, 0, 0.08);
    color: var(--color-text-on-light);
  }

  @media (max-width: 760px) {
    .nav-links {
      display: none;
    }

    .hamburger {
      display: flex;
    }

    .nav-pill {
      padding: 0.5rem 0.65rem 0.5rem 1.25rem;
    }
  }
</style>
