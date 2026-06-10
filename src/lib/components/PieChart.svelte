<script>
  import { fnFormatPercent } from '$lib/utils/formatters';

  // local variables
  let {
    distribution: distributionMap = {},
    title: chartTitle = '',
    palette = ['#ffffff', '#cccccc', '#aaaaaa', '#888888', '#666666', '#444444', '#333333', '#222222'],
    maxLegendRows = 5,
    legendColumns = 1
  } = $props();

  // bound to the <canvas> in the template, and must exist before chart.js can draw
  let canvasElement = $state();
  let chartInstance;

  const hasData = $derived(Object.keys(distributionMap).length > 0);

  const breakdownRows = $derived.by(() => {
    const sortedEntries = Object.entries(distributionMap).sort(([, a], [, b]) => b - a);
    if (!sortedEntries.length) return [];

    const totalCount = sortedEntries.reduce((sum, [, count]) => sum + count, 0);
    const fitsWithoutOther = sortedEntries.length <= maxLegendRows;
    const visibleEntries = fitsWithoutOther ? sortedEntries : sortedEntries.slice(0, maxLegendRows - 1);
    const overflowEntries = fitsWithoutOther ? [] : sortedEntries.slice(maxLegendRows - 1);
    const overflowCount = overflowEntries.reduce((sum, [, count]) => sum + count, 0);

    const rows = visibleEntries.map(([label, count]) => ({
      label,
      count,
      pct: fnFormatPercent(totalCount > 0 ? (count / totalCount) * 100 : 0),
      isOther: false
    }));

    if (overflowCount > 0) {
      rows.push({
        label: 'Other',
        count: overflowCount,
        pct: fnFormatPercent(totalCount > 0 ? (overflowCount / totalCount) * 100 : 0),
        isOther: true
      });
    }

    return rows;
  });

  function fnBuildPieChart() {
    if (!canvasElement || !hasData) return;
    if (chartInstance) chartInstance.destroy();

    const sliceLabels = breakdownRows.map((row) => row.label);
    const sliceValues = breakdownRows.map((row) => row.count);
    const sliceColors = breakdownRows.map((row, rowIndex) => row.isOther ? '#555555' : (palette[rowIndex] ?? '#555555'));

    // lazy import so Chart.js isn't bundled into the initial page load
    import('chart.js/auto').then(({ Chart }) => {
      chartInstance = new Chart(canvasElement, {
        type: 'doughnut',
        data: {
          labels: sliceLabels,
          datasets: [{
            data: sliceValues,
            backgroundColor: sliceColors,
            borderWidth: 0
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

  $effect(() => {
    distributionMap;
    palette;
    fnBuildPieChart();
    return () => chartInstance?.destroy();
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

    <div
      class="breakdown"
      class:two-col={legendColumns === 2}
      style:--per-col-rows={Math.ceil(maxLegendRows / 2)}
    >

      {#each breakdownRows as row, rowIndex}

        <div class="bd-row">
          <span class="dot" style="background: {row.isOther ? '#555555' : (palette[rowIndex] ?? '#555555')}"></span>
          <span class="bd-label">{row.label}</span>
          <span class="bd-count">{row.count.toLocaleString()}</span>
          <span class="bd-pct">{row.pct}</span>
        </div>

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
    height: 400px;
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
    margin-top: 0.6rem;
  }

  .breakdown {
    display: grid;
    grid-template-columns: 1fr;
    row-gap: 0.3rem;
    column-gap: 1.5rem;
    margin: 0.25rem auto 0;
    font-size: 0.8rem;
  }

  .breakdown.two-col {
    grid-template-columns: 1fr 1fr;
    grid-auto-flow: column;
    grid-template-rows: repeat(var(--per-col-rows, 5), auto);
  }

  .bd-row {
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr) 3.5rem 2.5rem;
    column-gap: 0.5rem;
    align-items: center;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .bd-label {
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    min-width: 0;
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
