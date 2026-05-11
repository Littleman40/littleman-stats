<script>
  const features = [
    {
      href: '/user-search',
      title: 'User Search',
      description: 'Look up any player by their Steam ID or No Hesi username. See their personal best stats, ranking, tier, and full run history with charts.',
      image: '/images/feature-user-search.jpg'
    },
    {
      href: '/leaderboard',
      title: 'Leaderboard',
      description: 'Browse the global No Hesi leaderboard. Filter by crew, solo, or realistic physics. Switch to statistics mode for charts regarding everything.',
      image: '/images/feature-leaderboard.jpg'
    },
    {
      href: '/littleman-timing',
      title: 'LittleMan Timing',
      description: 'A dedicated timing app for routes around No Hesi',
      image: '/images/feature-timing.jpg'
    },
    {
      href: '/faq',
      title: 'FAQ',
      description: 'Searchable answers to the most common questions about No Hesi.',
      image: '/images/feature-faq.jpg'
    }
  ];
</script>

<svelte:head>
  <title>LittleMan Stats</title>
</svelte:head>

<!-- Hero -->
<section class="hero">
  <div class="hero-content">
    <h1>The No Hesi Stats Hub</h1>
    <p>Track players, explore leaderboards, and dig into the data behind every run.</p>
    <a href="/leaderboard" class="cta-btn">View Leaderboard</a>
  </div>
  <div class="scroll-hint">Scroll ↓</div>
</section>

<section class="features page-wrapper">
  {#each features as feature, i}
    <div class="feature-card" class:reverse={i % 2 === 1}>
      <div class="feature-image-wrap">
        <div class="feature-image-placeholder" style="background-image: url('{feature.image}')"></div>
      </div>
      <div class="feature-text">
        <h2>{feature.title}</h2>
        <p>{feature.description}</p>
        <a href={feature.href} class="go-btn">Go To →</a>
      </div>
    </div>
  {/each}
</section>

<style>
  .hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    background: var(--color-bg);
    background-image: linear-gradient(160deg, #111111 0%, #0a0a0a 60%, #141414 100%);
    background-size: cover;
    background-position: center;
    text-align: center;
    padding: 2rem var(--page-padding);
  }

  .hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    pointer-events: none;
  }

  .hero-content {
    position: relative;
    z-index: 1;
    max-width: 640px;
  }

  .hero-content h1 {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 700;
    color: var(--color-text);
    line-height: 1.15;
    margin-bottom: 1rem;
  }

  .hero-content p {
    font-size: 1.1rem;
    color: var(--color-muted);
    margin-bottom: 2rem;
  }

  .cta-btn {
    display: inline-block;
    padding: 0.7rem 1.75rem;
    background: var(--color-text);
    color: var(--color-text-on-light);
    font-weight: 600;
    font-size: 0.95rem;
    border-radius: var(--radius-btn);
    transition: opacity 0.15s;
  }

  .cta-btn:hover {
    opacity: 0.88;
  }

  .scroll-hint {
    position: absolute;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    color: var(--color-muted);
    font-size: 0.8rem;
    letter-spacing: 0.05em;
    z-index: 1;
  }

  .features {
    padding-top: 4rem;
    padding-bottom: 4rem;
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
  }

  .feature-card {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    padding: 1.5rem;
    align-items: center;
  }

  .feature-card.reverse {
    direction: rtl;
  }

  .feature-card.reverse > * {
    direction: ltr;
  }

  .feature-image-wrap {
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: 6px;
    overflow: hidden;
  }

  .feature-image-placeholder {
    width: 100%;
    height: 100%;
    background-color: var(--color-card-raised);
    background-size: cover;
    background-position: center;
    background-image: linear-gradient(135deg, #1e1e1e 0%, #242424 100%);
  }

  .feature-text {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .feature-text h2 {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .feature-text p {
    color: var(--color-muted);
    font-size: 0.95rem;
    line-height: 1.6;
  }

  .go-btn {
    display: inline-block;
    align-self: flex-start;
    padding: 0.5rem 1.25rem;
    background: var(--color-text);
    color: var(--color-text-on-light);
    font-weight: 600;
    font-size: 0.875rem;
    border-radius: var(--radius-btn);
    transition: opacity 0.15s;
    margin-top: 0.25rem;
  }

  .go-btn:hover {
    opacity: 0.88;
  }

  @media (max-width: 640px) {
    .feature-card {
      grid-template-columns: 1fr;
    }

    .feature-card.reverse {
      direction: ltr;
    }
  }
</style>
