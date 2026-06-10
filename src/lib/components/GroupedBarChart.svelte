<script>
  import { fnFormatPercent } from '$lib/utils/formatters';

  // local variables
  let {
    labels: groupLabels = [],
    series: chartSeries = [],
    displayMode = 'percentage',
    orientation = 'vertical',
    stacked = false,
    title: chartTitle = ''
  } = $props();

  let canvasElement = $state();
  let chartInstance;

  const hasData = $derived(
    chartSeries.length > 0 && chartSeries.some((s) => s.values?.some((v) => v > 0))
  );

  function fnBuildGroupedChart() {
    if (!canvasElement || !hasData) return;
    if (chartInstance) chartInstance.destroy();

    const isPercentageMode = displayMode === 'percentage';
    const isHorizontal = orientation === 'horizontal';

    // value axis
    const valueAxisOptions = {
      stacked: stacked,
      beginAtZero: true,
      min: 0,
      max: isPercentageMode ? 100 : undefined,
      ticks: {
        color: '#a0a0a0',
        font: { size: 11 },
        callback: (value) => isPercentageMode ? `${value}%` : value.toLocaleString()
      },
      grid: { color: '#2e2e2e' }
    };

    // category axis
    const categoryAxisOptions = {
      stacked: stacked,
      ticks: { color: '#a0a0a0', font: { size: 11 } },
      grid: { display: false }
    };

    const scales = isHorizontal
      ? { x: valueAxisOptions, y: categoryAxisOptions }
      : { x: categoryAxisOptions, y: valueAxisOptions };


    const labelsCopy = [...groupLabels];
    const datasetsCopy = chartSeries.map((s) => ({
      label: s.label,
      data: [...s.values],
      backgroundColor: s.color,
      borderColor: '#000000',
      borderWidth: 1,
      borderRadius: 2,
      maxBarThickness: 40
    }));

    // lazy import so chart.js isn't bundled into the initial page load
    import('chart.js/auto').then(({ Chart }) => {
      chartInstance = new Chart(canvasElement, {
        type: 'bar',
        data: {
          labels: labelsCopy,
          datasets: datasetsCopy
        },
        options: {
          indexAxis: isHorizontal ? 'y' : 'x',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: '#a0a0a0',
                font: { size: 11 },
                boxWidth: 10,
                boxHeight: 10,
                padding: 14,
                usePointStyle: true,
                pointStyle: 'rect'
              }
            },
            tooltip: {
              callbacks: {

                // tooltip shows series label, percentage, and raw count when available
                label: (tooltipCtx) => {
                  const seriesIndex = tooltipCtx.datasetIndex;
                  const dataIndex = tooltipCtx.dataIndex;
                  const value = isHorizontal ? tooltipCtx.parsed.x : tooltipCtx.parsed.y;
                  const series = chartSeries[seriesIndex];
                  const rawCount = series?.rawCounts?.[dataIndex];

                  if (isPercentageMode) {
                    const valueLabel = fnFormatPercent(value, { decimals: 1 });
                    return rawCount != null
                      ? ` ${series.label}: ${valueLabel} (${rawCount.toLocaleString()} runs)`
                      : ` ${series.label}: ${valueLabel}`;
                  }
                  return ` ${series.label}: ${value.toLocaleString()}`;
                }
              }
            }
          },
          scales: scales
        }
      });
    });
  }

  // reading the props here tells svelte to re-run this effect whenever any prop changes (also fires once on initial mount)
  $effect(() => {
    groupLabels;
    chartSeries;
    displayMode;
    orientation;
    stacked;
    fnBuildGroupedChart();

    // cleanup runs before the next effect re-run AND on component unmount, so the previous chart is always destroyed before a new one is built on the same canvas
    return () => chartInstance?.destroy();
  });
</script>

<div class="grouped-wrap">

  {#if chartTitle}
    <p class="chart-title">{chartTitle}</p>
  {/if}

  {#if hasData}
  
    <div class="chart-container">
      <canvas bind:this={canvasElement}></canvas>
    </div>

  {:else}

    <div class="no-data">No data</div>

  {/if}
</div>

<style>
  .grouped-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 1rem;
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    width: 100%;
    height: 380px;
  }

  .chart-title {
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-muted);
  }

  .chart-container {
    position: relative;
    flex: 1;
    min-height: 0;
  }

  canvas {
    width: 100% !important;
    height: 100% !important;
  }

  .no-data {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    color: var(--color-muted);
    border: 1px dashed var(--color-border);
    border-radius: 0.4rem;
  }
</style>
