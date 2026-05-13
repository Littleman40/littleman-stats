<script>
  const navLinks = [                                                    // navigation links for pages
    { href: '/user-search', label: 'User Stats' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/littleman-timing', label: 'LittleMan Timing' },
    { href: '/faq', label: 'FAQ' }
  ];
</script>

<footer>
  <div class="footer-inner page-wrapper">
    <div class="footer-top">
      <div class="brand-col">
        <span class="brand">LittleMan Stats</span>
        <p class="tagline">An indepth statistics viewer for No Hesi.</p>
      </div>

      <div class="links-col">
        <span class="col-label">Navigation</span>
        <ul>
          {#each navLinks as link}                            <!-- list all links -->
            <li><a href={link.href}>{link.label}</a></li>
          {/each}
        </ul>
      </div>

      <div class="links-col">
        <span class="col-label">Legal</span>
        <ul>
          <li><span class="muted">LittleManStats is not affiliated with No Hesi.</span></li>
          <li><a href="/terms">Terms of Use</a></li>
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <span class="muted">© {new Date().getFullYear()} LittleMan Stats</span>
      <div class="socials">
        <a href="https://www.littleman.dev/" aria-label="Website" target="_blank" class="social-icon">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855A8 8 0 0 0 5.145 4H7.5zM4.09 4a9.3 9.3 0 0 1 .64-1.539 7 7 0 0 1 .597-.933A7.03 7.03 0 0 0 2.255 4zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a7 7 0 0 0-.656 2.5zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5zM8.5 5v2.5h2.99a12.5 12.5 0 0 0-.337-2.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5zM5.145 12q.208.58.468 1.068c.552 1.035 1.218 1.65 1.887 1.855V12zm.182 2.472a7 7 0 0 1-.597-.933A9.3 9.3 0 0 1 4.09 12H2.255a7 7 0 0 0 3.072 2.472M3.82 11a13.7 13.7 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5zm6.853 3.472A7 7 0 0 0 13.745 12H11.91a9.3 9.3 0 0 1-.64 1.539 7 7 0 0 1-.597.933M8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855q.26-.487.468-1.068zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.7 13.7 0 0 1-.312 2.5m2.802-3.5a7 7 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7 7 0 0 0-3.072-2.472c.218.284.418.598.597.933M10.855 4a8 8 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4z"/>
          </svg>
        </a>
        <a href="http://discord.gg/JqBC88j2DU" aria-label="Discord" target="_blank" class="social-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
        </a>
        <a href="https://www.youtube.com/@LittleMan_40" target="_blank" aria-label="YouTube" class="social-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </a>
      </div>
    </div>
  </div>
</footer>

<style>
  footer {
    background: var(--color-bg-alt);
    border-top: 1px solid var(--color-border);
    padding: 2rem 0;
    margin-top: auto;
  }

  .footer-top {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .brand {
    font-weight: 700;
    font-size: 1rem;
    color: var(--color-text);
    display: block;
    margin-bottom: 0.5rem;
  }

  .tagline {
    color: var(--color-muted);
    font-size: 0.875rem;
  }

  .col-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-muted);
    margin-bottom: 0.75rem;
  }

  .links-col ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .links-col a {
    color: var(--color-muted);
    font-size: 0.875rem;
    transition: color 0.15s;
  }

  .links-col a:hover {
    color: var(--color-text);
  }

  .muted {
    color: var(--color-muted);
    font-size: 0.875rem;
  }

  .footer-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-border);
  }

  .socials {
    display: flex;
    gap: 1rem;
  }

  .social-icon {
    color: var(--color-text);
    transition: color 0.15s;
    display: flex;
    align-items: center;
  }

  .social-icon:hover {
    color: var(--color-muted);
  }

  @media (max-width: 640px) {
    .footer-top {
      grid-template-columns: 1fr;
    }
  }
</style>