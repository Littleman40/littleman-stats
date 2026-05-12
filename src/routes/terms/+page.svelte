<svelte:head>
  <title>Terms of Use - LittleMan Stats</title>
</svelte:head>

<div class="page page-wrapper">
  <div class="page-header">
    <h1>Terms of Use</h1>
    <p>Last updated: May 2026</p>
  </div>

  <section>
    <h2>About LittleManStats</h2>
    <p>
      LittleManStats is a fan-made stats viewer for No HesiIt
      reformats publicly available leaderboard data into an easier-to-browse interface
      for the community. This site is not an official No Hesi product.
    </p>
  </section>

  <section>
    <h2>Use of the No Hesi API</h2>
    <p>
      All score data shown here originates from No Hesi's public leaderboard endpoint.
      We do our best to be a good guest of their service:
    </p>
    <ul>
      <li>Responses are cached on our server for 5 minutes before being refreshed, so a viewer browsing the leaderboard does not trigger a request to No Hesi for every page change or filter toggle.</li>
      <li>Background fetches are paginated and run in a single sequential loop per filter, never in parallel bursts.</li>
      <li>No write or authenticated endpoints are used. LittleManStats only reads what is already public.</li>
    </ul>
    <p>
      If you spot behaviour from this site that looks like abuse of the upstream API,
      please let us know so we can fix it.
    </p>
  </section>

  <section>
    <h2>Affiliation and Ownership</h2>
    <p>
      LittleManStats is not affiliated with, endorsed by, or otherwise connected to
      No Hesi or its operators. All game names, player names, profile images and other
      content surfaced through the No Hesi API remain the property of their respective
      owners. We claim no ownership over any of that material; we only display it.
    </p>
  </section>

  <section>
    <h2>Takedown and Cessation</h2>
    <p>
      If the No Hesi team, or any rights holder whose content is surfaced here, would
      prefer that LittleManStats no longer use their API or display their data, we
      will respect that. Send a request through our community channels and we will
      either adjust the site or take it offline entirely, whichever is asked of us.
    </p>
  </section>

  <section>
    <h2>No Warranty</h2>
    <p>
      The site is provided "as is" for community and entertainment purposes. Numbers
      shown here may be out of date, incomplete, or affected by upstream changes
      outside our control. Don't rely on LittleManStats for anything important.
    </p>
  </section>

  <section>
    <h2>Changes To These Terms</h2>
    <p>
      These terms may be updated as the site evolves. The "Last updated" date at the
      top of the page reflects the most recent revision.
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

  .page-header p {
    color: var(--color-muted);
    font-size: 0.85rem;
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

  ul {
    list-style: disc;
    padding-left: 1.25rem;
    margin-bottom: 0.6rem;
  }

  li {
    color: var(--color-muted);
    font-size: 0.9rem;
    line-height: 1.6;
    margin-bottom: 0.3rem;
  }
</style>
