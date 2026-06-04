<svelte:head>
  <title>About - LittleMan Stats</title>
</svelte:head>

<div class="page page-wrapper">
  <div class="page-header">
    <h1>About</h1>
  </div>

  <section>
    <p>
      Welcome to my major project for HSC Enterprise Computing. This entire website is built around
      <a href="https://nohesi.gg/" target="_blank" rel="noopener noreferrer">No Hesi</a>, an online
      racing community with over a million players throughout its lifetime. I am very lucky and
      privileged to be a part of the staff team as a supporter, helping users with issues, and
      communicating bugs with the developers.
    </p>
    <p>
      Our website has 4 main pages: User Search, Leaderboard, Ranks and the FAQ. Our website also
      has a scraper that runs through GitHub Actions each day.
    </p>
  </section>

  <section>
    <h2>User Search</h2>
    <p>
      This page allows you to search for players who play No Hesi by either their Steam ID or No
      Hesi username. This will return you with their personal best score, alongside their account
      information. This page used to include a full run history and statistics about the user's past
      runs; however, sadly, this API endpoint was locked behind an API key halfway through the
      development of this project.
    </p>
  </section>

  <section>
    <h2>Leaderboard</h2>
    <p>
      This page hosts two main views: the leaderboard view and the statistics view. The leaderboard
      view calls directly from the API and is constantly up to date, whilst the statistics view just
      aggregates data from a JSON file that is created once a day from our scraper. The leaderboard
      view allows users to filter the leaderboard in ways that No Hesi doesn't allow you to, at the
      time of writing this. The statistics view also contains different charts and statistics for
      each filter for the leaderboard.
    </p>
  </section>

  <section>
    <h2>Ranks</h2>
    <p>
      This page used to scrape directly from an API endpoint; however, this endpoint was never
      accurate, so instead, I am now just aggregating data from a JSON file that is created once a
      day from our scraper. This page allows users to see data about each rank in ways that No Hesi
      doesn't allow you to.
    </p>
  </section>

  <section>
    <h2>FAQ</h2>
    <p>
      This page contains a full list of the FAQ's that were created for No Hesi. It allows you to
      search for any issue you may face while playing the game.
    </p>
  </section>
</div>

<style>
  .page {
    padding-top: 2.5rem;
    padding-bottom: 4rem;
  }

  .page-header {
    margin-bottom: 1.5rem;
  }

  .page-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 0.4rem;
  }

  section {
    margin-bottom: 1.75rem;
    max-width: 720px;
  }

  h2 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  p {
    color: var(--color-muted);
    font-size: 0.9rem;
    line-height: 1.6;
    margin-bottom: 0.6rem;
  }

  a {
    color: var(--color-text);
    text-decoration: underline;
  }

  a:hover {
    color: var(--color-muted);
  }
</style>
