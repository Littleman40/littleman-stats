<script>
  import { onMount } from 'svelte';

  let { distribution: distributionMap = {}, title: chartTitle = '' } = $props();

  let canvasElement = $state();
  let chartInstance;

  const GREYSCALE_PALETTE = [
    '#ffffff', '#cccccc', '#aaaaaa', '#888888',
    '#666666', '#444444', '#333333', '#222222'
  ];

  const hasData = $derived(Object.keys(distributionMap).length > 0);

  const breakdownRows = $derived.by(() => {                                        // builds the legend-style table under the doughnut: top 4 entries + an 'Other' bucket
    const sortedEntries = Object.entries(distributionMap).sort(([, a], [, b]) => b - a);
    if (!sortedEntries.length) return [];

    const totalCount = sortedEntries.reduce((sum, [, count]) => sum + count, 0);
    const topEntries = sortedEntries.slice(0, 4);
    const restEntries = sortedEntries.slice(4);
    const otherCount = restEntries.reduce((sum, [, count]) => sum + count, 0);

    const rows = topEntries.map(([label, count]) => ({
      label,
      count,
      pct: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
    }));

    if (otherCount > 0) {
      rows.push({
        label: 'Other',
        count: otherCount,
        pct: totalCount > 0 ? Math.round((otherCount / totalCount) * 100) : 0
      });
    }

    return rows;
  });

  function fnBuildPieChart() {                                                     // called from onMount below + the distribution-change $effect below
    if (!canvasElement || !hasData) return;
    if (chartInstance) chartInstance.destroy();

    const sliceLabels = Object.keys(distributionMap);
    const sliceValues = Object.values(distributionMap);

    import('chart.js/auto').then(({ Chart }) => {
      chartInstance = new Chart(canvasElement, {
        type: 'doughnut',
        data: {
          labels: sliceLabels,
          datasets: [{
            data: sliceValues,
            backgroundColor: sliceLabels.map((_label, sliceIndex) => GREYSCALE_PALETTE[sliceIndex % GREYSCALE_PALETTE.length]),
            borderColor: '#0a0a0a',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: 0 },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (tooltipCtx) => ` ${tooltipCtx.label}: ${tooltipCtx.parsed.toLocaleString()}`
              }
            }
          }
        }
      });
    });
  }

  onMount(() => {
    fnBuildPieChart();
    return () => chartInstance?.destroy();
  });

  $effect(() => {
    distributionMap;
    fnBuildPieChart();
  });
</script>

<div class="pie-wrap">
  {#if hasData}
    <div class="chart-container">
      <canvas bind:this={canvasElement}></canvas>
    </div>
  {:else}
    <div class="no-data">Unknown</div>
  {/if}

  {#if chartTitle}
    <p class="chart-title">{chartTitle}</p>
  {/if}

  {#if breakdownRows.length}
    <div class="breakdown">
      {#each breakdownRows as row, rowIndex}
        <span class="dot" style="background: {rowIndex < 4 ? GREYSCALE_PALETTE[rowIndex] : '#555555'}"></span>
        <span class="bd-label">{row.label}</span>
        <span class="bd-count">{row.count.toLocaleString()}</span>
        <span class="bd-pct">{row.pct}%</span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .pie-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 1rem;
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    width: 100%;
    height: 350px;
  }

  .chart-container {
    position: relative;
    width: 180px;
    height: 180px;
    flex-shrink: 0;
  }

  canvas {
    position: absolute;
    inset: 0;
    width: 100% !important;
    height: 100% !important;
  }

  .no-data {
    width: 180px;
    height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    color: var(--color-muted);
    border: 1px dashed var(--color-border);
    border-radius: 50%;
    flex-shrink: 0;
  }

  .chart-title {
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-muted);
    margin-top: 0.1rem;
  }

  .breakdown {
    display: grid;
    grid-template-columns: 10px auto 3.5rem 2.5rem;
    column-gap: 0.5rem;
    row-gap: 0.3rem;
    align-items: center;
    width: fit-content;
    margin: 0.25rem auto 0;
    font-size: 0.8rem;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 2px;
  }

  .bd-label {
    color: var(--color-text);
  }

  .bd-count {
    color: var(--color-muted);
    text-align: right;
  }

  .bd-pct {
    color: var(--color-muted);
    text-align: right;
  }
</style>
