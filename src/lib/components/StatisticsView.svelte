<script>
  import BarChart from './BarChart.svelte';
  import GroupedBarChart from './GroupedBarChart.svelte';
  import PieChart from './PieChart.svelte';
  import ScatterChart from './ScatterChart.svelte';
  import TallyList from './TallyList.svelte';
  import { fnFormatPercent as fnFormatPercentValue } from '$lib/utils/formatters';

  // local variables
  let {                                                                            
    filters: filtersByName = null,
    activeFilter = 'all',
    loading: isLoading = false,
    error: loadError = null,
    onretry
  } = $props();

  // leaderboard ranks
  const RANK_DISPLAY_ORDER = [
    'Certified', 'Sanctioned', 'Ghost', 'Licensed', 'Marked', 'Noticed', 'Listed'
  ];

  // input codes that are retrieved from the api
  const INPUT_CODE_LABELS = {                                                      
    0: 'Wheel',
    1: 'Controller',
    2: 'Keyboard and Mouse'
  };

  // the labels for all the run times - runs max out at 3 minutes this series, so 6 buckets of half a minute each
  const RUN_TIME_LABELS = Array.from({ length: 6 }, (_, i) => `${i * 0.5}-${(i + 1) * 0.5}`);

  // colours for crew vs solo graphs
  const SERIES_COLOR_CREW = '#FF4069';
  const SERIES_COLOR_SOLO = '#36A2EB';

  // colour for the realistic physics series
  const SERIES_COLOR_REALISTIC = '#fb923c';

  // colour palletes for all charts
  const PALETTE_MAP     = ['#A78BFB', '#FF6384', '#33D399', '#0F766E', '#F59E0B', '#6D28D9', '#14B8A6'];
  const PALETTE_INPUT   = ['#A78BFB', '#FF6384', '#33D399'];
  const PALETTE_TRAFFIC = ['#A78BFB', '#FF6384', '#33D399', '#0F766E', '#F59E0B'];
  const PALETTE_CAMERA  = ['#0C4A6E', '#0891B2', '#14532D', '#10B981', '#F59E0B', '#FBBF24', '#F43F5E', '#FB7185', '#D946EF', '#C084FC', '#8B5CF6', '#6366F1'];
  const PALETTE_TYRE    = ['#0C4A6E', '#0891B2', '#14532D', '#10B981', '#F59E0B', '#FBBF24', '#F43F5E', '#FB7185', '#D946EF', '#C084FC', '#8B5CF6', '#6366F1'];

  const activeData = $derived(filtersByName?.[activeFilter] ?? null);              // the aggregations bucket for whichever filter is active
  const allData    = $derived(filtersByName?.all ?? null);                         // the 'all' bucket is reused for total-runs context in every other filter's header

  // shared totals
  const filterTotalRuns = $derived(activeData?.total_runs ?? 0);
  const overallTotalRuns = $derived(allData?.total_runs ?? 0);
  const crewRuns = $derived(allData?.mode_split?.crew ?? 0);
  const soloRuns = $derived(allData?.mode_split?.solo ?? 0);

  // rank chart series (all filter: crew% vs solo% per rank)
  const rankChartSeriesAll = $derived.by(() => {
    const histogram = activeData?.rank_histogram ?? {};
    const crewPercentages = [];
    const soloPercentages = [];
    const crewCounts = [];
    const soloCounts = [];

    for (const rankName of RANK_DISPLAY_ORDER) {
      const bucket = histogram[rankName] ?? { crew: 0, solo: 0 };
      const rankTotal = bucket.crew + bucket.solo;
      crewPercentages.push(rankTotal > 0 ? (bucket.crew / rankTotal) * 100 : 0);
      soloPercentages.push(rankTotal > 0 ? (bucket.solo / rankTotal) * 100 : 0);
      crewCounts.push(bucket.crew);
      soloCounts.push(bucket.solo);
    }

    return [
      { label: 'Solo', values: soloPercentages, rawCounts: soloCounts, color: SERIES_COLOR_SOLO },
      { label: 'Crew', values: crewPercentages, rawCounts: crewCounts, color: SERIES_COLOR_CREW }
    ];
  });

  // rank chart - splits the data into each rank, and each rank is either realistic physics or not. realistic now covers crew and solo runs since every entry is a single player
  const realisticRankSeries = $derived.by(() => {
    const realisticHist = filtersByName?.realistic?.rank_histogram ?? {};
    const allHist = filtersByName?.all?.rank_histogram ?? {};                      // all-filter's rank histogram carries the total run counts per rank

    const realisticPcts = [];
    const normalPcts = [];
    const realisticCounts = [];
    const normalCounts = [];

    for (const rankName of RANK_DISPLAY_ORDER) {
      const realisticBucket = realisticHist[rankName] ?? { crew: 0, solo: 0 };
      const allBucket = allHist[rankName] ?? { crew: 0, solo: 0 };

      const realisticAt = realisticBucket.crew + realisticBucket.solo;             // realistic runs at this rank, crew and solo combined
      const totalAt = allBucket.crew + allBucket.solo;                             // every run at this rank
      const normalAt = Math.max(0, totalAt - realisticAt);                         // non-realistic runs at this rank

      if (totalAt > 0) {
        realisticPcts.push((realisticAt / totalAt) * 100);
        normalPcts.push((normalAt / totalAt) * 100);
      } else {
        realisticPcts.push(0);
        normalPcts.push(0);
      }

      realisticCounts.push(realisticAt);
      normalCounts.push(normalAt);
    }

    return [
      { label: 'Realistic Physics', values: realisticPcts, rawCounts: realisticCounts, color: SERIES_COLOR_REALISTIC },
      { label: 'Non-Realistic',     values: normalPcts,    rawCounts: normalCounts,    color: SERIES_COLOR_SOLO }
    ];
  });

  // crew filter scatter points - each crew run is one point with prox time along the bottom and prox combo up the side
  const proxScatterPoints = $derived.by(() => {
    const rawPoints = activeData?.prox_scatter ?? [];
    return rawPoints.map((point) => ({ x: point.prox_time, y: point.prox_combo }));
  });

  // input label fixes
  const inputDistributionRelabeled = $derived.by(() => {                           // converts raw numeric input codes for inputs to the text equivalent
    const rawDistribution = activeData?.input_distribution ?? {};
    const labelled = {};
    for (const [rawCode, count] of Object.entries(rawDistribution)) {
      const friendlyLabel = INPUT_CODE_LABELS[Number(rawCode)] ?? `Unknown (${rawCode})`;
      labelled[friendlyLabel] = count;
    }
    return labelled;
  });

  const runTimeValues = $derived(activeData?.run_time_histogram ?? []);

  // score distribution graph for solo filter
  const scoreHistogram = $derived.by(() => {
    const hist = activeData?.score_histogram;
    if (!hist?.counts || !hist?.bucket_width) return null;

    const { bucket_width, counts } = hist;
    const labels = counts.map((_, i) => fnFormatScoreShort(i * bucket_width));    // lower bound of each bucket as the bar label
    return { labels, values: counts };
  });

  // formats score's from large text to having a prefix
  function fnFormatScoreShort(score) {
    if (score >= 1_000_000_000) return `>${(score / 1_000_000_000).toFixed(1)}B`;
    if (score >= 1_000_000) return `>${Math.round(score / 1_000_000)}M`;
    if (score >= 1_000) return `>${Math.round(score / 1_000)}K`;
    return `>${score}`;
  }

  // rounds number
  function fnFormatNumber(n) {
    return (n ?? 0).toLocaleString();
  }

  // rounds percentages
  function fnFormatPercent(numerator, denominator) {
    if (!denominator) return '0%';
    return fnFormatPercentValue((numerator / denominator) * 100, { decimals: 1 });
  }
</script>

<div class="stats-wrap">
  {#if isLoading}
    <div class="stats-loading">
      <div class="skeleton-row skeleton-cards">
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
      </div>
      <div class="skeleton skeleton-large"></div>
      <div class="skeleton-row skeleton-pies">
        <div class="skeleton skeleton-pie"></div>
        <div class="skeleton skeleton-pie"></div>
        <div class="skeleton skeleton-pie"></div>
      </div>
      <div class="skeleton skeleton-large"></div>
    </div>
  {:else if loadError}
    <div class="stats-error">
      <p class="error-title">Statistics not available</p>
      <p class="error-detail">{loadError}</p>
      {#if onretry}
        <button class="retry-btn" onclick={() => onretry?.()}>Retry</button>
      {/if}
    </div>
  {:else if activeData}
    <div class="stats-view">

      <!-- all filter stuff -->
      {#if activeFilter === 'all'}

        <section class="header-totals header-totals-3">
          <div class="total-card">
            <p class="total-line">Total Run Count: {fnFormatNumber(filterTotalRuns)}</p>
          </div>
          <div class="total-card">
            <p class="total-line">Total Crew Run Count: {fnFormatNumber(crewRuns)}</p>
          </div>
          <div class="total-card">
            <p class="total-line">Total Solo Run Count: {fnFormatNumber(soloRuns)}</p>
          </div>
        </section>

        <section>
          <GroupedBarChart
            labels={RANK_DISPLAY_ORDER}
            series={rankChartSeriesAll}
            displayMode="percentage"
            orientation="horizontal"
            stacked={true}
            title="Mode Distribution by Rank"
          />
        </section>

        <section class="pie-row">
          <PieChart 
            distribution={activeData.map_distribution ?? {}} 
            title="Map Distribution" 
            palette={PALETTE_MAP} 
          />
          <PieChart 
            distribution={inputDistributionRelabeled} 
            title="Input Distribution" 
            palette={PALETTE_INPUT} 
          />
          <PieChart 
            distribution={activeData.traffic_distribution ?? {}} 
            title="Traffic Distribution" 
            palette={PALETTE_TRAFFIC} 
          />
        </section>

        <section>
          <BarChart
            labels={RUN_TIME_LABELS}
            values={runTimeValues}
            displayMode="percentage"
            color={SERIES_COLOR_SOLO}
            title="Run Time Distribution (minutes)"
            xLabel="Minutes"
          />
        </section>

      <!-- crew filter stuff -->
      {:else if activeFilter === 'crew'}

        <section class="header-totals header-totals-2">
          <div class="total-card">
            <p class="total-line">Total Run Count: {fnFormatNumber(overallTotalRuns)}</p>
          </div>
          <div class="total-card">
            <p class="total-line">Total Crew Run Count: {fnFormatNumber(filterTotalRuns)} ({fnFormatPercent(filterTotalRuns, overallTotalRuns)})</p>
          </div>
        </section>

        <section>
          <ScatterChart
            points={proxScatterPoints}
            color={SERIES_COLOR_CREW}
            title="Prox Combo Breakdown"
            xLabel="Prox Time (seconds)"
            yLabel="Prox Combo"
          />
        </section>

        <section class="pie-row">
          <PieChart 
            distribution={activeData.map_distribution ?? {}} 
            title="Map Distribution" 
            palette={PALETTE_MAP} 
          />
          <PieChart 
            distribution={inputDistributionRelabeled} 
            title="Input Distribution" 
            palette={PALETTE_INPUT} 
          />
          <PieChart 
            distribution={activeData.traffic_distribution ?? {}} 
            title="Traffic Distribution" 
            palette={PALETTE_TRAFFIC} 
          />
        </section>

      <!-- solo filter stuff -->
      {:else if activeFilter === 'solo'}

        <section class="header-totals header-totals-2">
          <div class="total-card">
            <p class="total-line">Total Run Count: {fnFormatNumber(overallTotalRuns)}</p>
          </div>
          <div class="total-card">
            <p class="total-line">Total Solo Run Count: {fnFormatNumber(filterTotalRuns)} ({fnFormatPercent(filterTotalRuns, overallTotalRuns)})</p>
          </div>
        </section>

        {#if scoreHistogram}
          <section>
            <BarChart
              labels={scoreHistogram.labels}
              values={scoreHistogram.values}
              displayMode="count"
              color={SERIES_COLOR_SOLO}
              title="Score Distribution"
              xLabel="Score"
              yLabel="Runs"
            />
          </section>
        {/if}

        <section class="pie-row">
          <PieChart 
            distribution={activeData.map_distribution ?? {}} 
            title="Map Distribution" 
            palette={PALETTE_MAP}
          />
          <PieChart 
            distribution={inputDistributionRelabeled} 
            title="Input Distribution" 
            palette={PALETTE_INPUT} 
          />
          <PieChart 
            distribution={activeData.traffic_distribution ?? {}} 
            title="Traffic Distribution" 
            palette={PALETTE_TRAFFIC} 
          />
        </section>

      <!-- realistic physics filter stuff -->
      {:else if activeFilter === 'realistic'}

        <section class="header-totals header-totals-2">
          <div class="total-card">
            <p class="total-line">Total Run Count: {fnFormatNumber(overallTotalRuns)}</p>
          </div>
          <div class="total-card">
            <p class="total-line">Total Realistic Physics Run Count: {fnFormatNumber(filterTotalRuns)} ({fnFormatPercent(filterTotalRuns, overallTotalRuns)})</p>
          </div>
        </section>

        <section>
          <GroupedBarChart
            labels={RANK_DISPLAY_ORDER}
            series={realisticRankSeries}
            displayMode="percentage"
            orientation="horizontal"
            stacked={true}
            title="Mode Distribution by Rank"
          />
        </section>

        <section class="pie-row">
          <PieChart 
            distribution={activeData.map_distribution ?? {}} 
            title="Map Distribution" 
            palette={PALETTE_MAP} 
          />
          <PieChart 
            distribution={inputDistributionRelabeled} 
            title="Input Distribution" 
            palette={PALETTE_INPUT} 
          />
          <PieChart 
            distribution={activeData.traffic_distribution ?? {}} 
            title="Traffic Distribution" 
            palette={PALETTE_TRAFFIC} 
          />
        </section>

      {/if}

      <!-- the shared bottom row that every filter uses -->
      <section class="cars-and-extras">
        <div class="extras-column">
          <PieChart
            distribution={activeData.camera_distribution ?? {}}
            title="Camera Type"
            palette={PALETTE_CAMERA}
            maxLegendRows={8}
            legendColumns={2}
          />
          <PieChart
            distribution={activeData.tyre_compound_distribution ?? {}}
            title="Tyre Compound"
            palette={PALETTE_TYRE}
            maxLegendRows={10}
            legendColumns={2}
          />
        </div>
        <div class="cars-column">
          <p class="column-title">Cars Used Tally</p>
          <div class="cars-scroll">
            <TallyList tally={activeData.cars_tally ?? {}} />
          </div>
        </div>
      </section>

    </div>
  {/if}
</div>

<style>
  .stats-wrap {
    margin-top: 1rem;
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: 0.7rem;
    padding: 0.3rem;
  }

  .stats-wrap :global(.pie-wrap),
  .stats-wrap :global(.bar-wrap),
  .stats-wrap :global(.grouped-wrap),
  .stats-wrap :global(.scatter-wrap),
  .stats-wrap :global(.tally-row),
  .stats-wrap .cars-column {
    background: var(--color-card-raised);
  }

  .stats-view {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .header-totals {
    display: grid;
    gap: 0.3rem;
  }

  .header-totals-3 { grid-template-columns: repeat(3, 1fr); }
  .header-totals-2 { grid-template-columns: repeat(2, 1fr); }

  @media (max-width: 600px) {
    .header-totals-3,
    .header-totals-2 { grid-template-columns: 1fr; }
  }

  .total-card {
    background: var(--color-card-raised);
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    padding: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .total-line {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .pie-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.3rem;
  }

  @media (max-width: 900px) {
    .pie-row { grid-template-columns: 1fr; }
  }

  .cars-and-extras {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.3rem;
  }

  @media (max-width: 900px) {
    .cars-and-extras { grid-template-columns: 1fr; }
  }

  .cars-column {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 1rem;
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    min-width: 0;
  }

  .column-title {
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-muted);
  }

  .cars-scroll {
    max-height: 865px;
    overflow-y: auto;
    padding-right: 0.25rem;
    color-scheme: dark;
  }

  .extras-column {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
  }

  .extras-column :global(.pie-wrap) {
    height: 460px;
    gap: 0.3rem;
  }

  @media (max-width: 600px) {
    .extras-column :global(.pie-wrap) {
      height: auto;
    }
  }

  .stats-loading {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .skeleton {
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .skeleton-row {
    display: grid;
    gap: 0.3rem;
  }

  .skeleton-cards { grid-template-columns: repeat(3, 1fr); }
  .skeleton-pies  { grid-template-columns: repeat(3, 1fr); }

  .skeleton-card { height: 84px; }
  .skeleton-large { height: 350px; }
  .skeleton-pie { height: 350px; }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  .stats-error {
    padding: 3rem 1.5rem;
    text-align: center;
    color: var(--color-muted);
  }

  .error-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  .error-detail {
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  .retry-btn {
    padding: 0.5rem 1.25rem;
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-btn);
    color: var(--color-text);
    font-family: inherit;
    font-size: 0.875rem;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .retry-btn:hover {
    border-color: #555555;
  }
</style>
