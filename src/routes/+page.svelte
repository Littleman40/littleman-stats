<script>
  const features = [
    {
      href: '/user-search',
      title: 'User Search',
      description: 'Look up any player by their Steam ID or No Hesi username. See their personal best stats, ranking, tier, and full run history with charts.',
      image: '/img/UserSearchPreview.png'
    },
    {
      href: '/leaderboard',
      title: 'Leaderboard',
      description: 'Browse the global No Hesi leaderboard. Filter by crew, solo, or realistic physics. Switch to statistics mode for charts regarding everything.',
      image: '/img/LeaderboardPreview.png'
    },
    {
      href: '/littleman-timing',
      title: 'LittleMan Timing',
      description: 'A dedicated timing app for routes around No Hesi',
      image: '/img/LittleManTimingPreview.png'
    },
    {
      href: '/faq',
      title: 'FAQ',
      description: 'Searchable answers to the most common questions about No Hesi.',
      image: '/img/FAQPreview.png'
    }
  ];
</script>

<svelte:head>
  <title>LittleMan Stats</title>
</svelte:head>

<!-- Hero -->
<section class="hero">
  <video
    class="hero-video"
    src="/vid/LMBackgroundVideo.mp4"
    autoplay
    loop
    muted
    playsinline
    preload="auto"
  ></video>
  <div class="hero-content">
    <h1>No Hesi Stats Hub</h1>
    <p>Track players, filter leaderboards, and dig into the data behind every run.</p>
    <a href="/leaderboard" class="cta-btn">
      <span>View Leaderboard</span>
      <span class="cta-icon">
        <img src="/img/uprightarrow.svg" alt=""/>
      </span>
    </a>
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
        <a href={feature.href} class="go-btn">
          <span>Go To</span>
          <span class="go-icon">
            <img src="/img/uprightarrow.svg" alt="" />
          </span>
        </a>
      </div>
    </div>
  {/each}
</section>

<style>
  .hero {
    min-height: 100vh;
    margin-top: calc(-1 * var(--navbar-height));   /* extend behind the floating navbar so the video shows through */
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
    overflow: hidden;
  }

  .hero-video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
    pointer-events: none;
  }

  .hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    pointer-events: none;
    z-index: 1;
  }

  .hero-content {
    position: relative;
    z-index: 2;
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
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.3rem 0.3rem 0.3rem 1.25rem;
    background: var(--color-text);
    color: var(--color-text-on-light);
    font-weight: 600;
    font-size: 0.95rem;
    border-radius: var(--radius-pill);
    transition: opacity 0.15s;
  }

  .cta-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    background: var(--color-text-on-light);
    flex-shrink: 0;
  }

  .cta-icon img {
    width: 1rem;
    height: 1rem;
    filter: invert(1);
  }

  .scroll-hint {
    position: absolute;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    color: var(--color-muted);
    font-size: 0.8rem;
    letter-spacing: 0.05em;
    z-index: 2;
  }

  .features {
    padding-top: 4rem;
    padding-bottom: 4rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .feature-card {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    padding: 0.5rem;
    align-items: center;
  }

  .feature-card.reverse {
    direction: rtl;
  }

  .feature-card.reverse > * {
    direction: ltr;
  }

  .feature-card.reverse .feature-text {
    padding-left: 1.5rem;
  }

  .feature-image-wrap {
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: 23px;
    overflow: hidden;
    border: 1px solid rgb(44, 44, 44);
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
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    align-self: flex-start;
    padding: 0.25rem 0.25rem 0.25rem 1.25rem;
    background: var(--color-text);
    color: var(--color-text-on-light);
    font-weight: 600;
    font-size: 0.875rem;
    border-radius: var(--radius-pill);
    transition: opacity 0.15s;
    margin-top: 0.25rem;
  }

  .go-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.85rem;
    height: 1.85rem;
    border-radius: 50%;
    background: var(--color-text-on-light);
    flex-shrink: 0;
  }

  .go-icon img {
    width: 1rem;
    height: 1rem;
    filter: invert(1);
  }

  @media (max-width: 640px) {
    .feature-card {
      grid-template-columns: 1fr;
    }

    .feature-card.reverse {
      direction: ltr;
    }

    .feature-text,
    .feature-card.reverse .feature-text {
      padding-left: 1.5rem;
      padding-right: 1.5rem;
      padding-bottom: 1.5rem;
    }
  }
</style>
