<script>
  import { fnFormatPercent } from '$lib/utils/formatters';

  // local variables
  let {
    labels: barLabels = [],
    values: barValues = [],
    displayMode = 'count',
    color: barColor = '#ffffff',
    title: chartTitle = '',
    xLabel: xAxisLabel = '',
    yLabel: yAxisLabel = ''
  } = $props();

  let canvasElement = $state();
  let chartInstance;

  const hasData = $derived(barValues.some((value) => value > 0));

  // pre-computes percentages so both y-axis and tooltips can read from the same source
  const computedPercentages = $derived.by(() => {
    const total = barValues.reduce((sum, value) => sum + (value ?? 0), 0);
    if (total === 0) return barValues.map(() => 0);
    return barValues.map((value) => ((value ?? 0) / total) * 100);
  });

  function fnBuildBarChart() {
    if (!canvasElement || !hasData) return;
    if (chartInstance) chartInstance.destroy();

    const isPercentageMode = displayMode === 'percentage';
    const yAxisData = isPercentageMode ? [...computedPercentages] : [...barValues];
    const labelsCopy = [...barLabels];


    // lazy import so chart.js isn't bundled into the initial page load
    import('chart.js/auto').then(({ Chart }) => {
      chartInstance = new Chart(canvasElement, {
        type: 'bar',
        data: {
          labels: labelsCopy,
          datasets: [{
            data: yAxisData,
            backgroundColor: barColor,
            maxBarThickness: 60
          }]
        },
        options: {
          responsive: true,
          // let the css-driven wrapper height control the chart height instead of forcing a square
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                // tooltip shows raw count + percentage when in percentage mode for context
                label: (tooltipCtx) => {
                  const rawCount = barValues[tooltipCtx.dataIndex] ?? 0;
                  if (isPercentageMode) {
                    const pct = computedPercentages[tooltipCtx.dataIndex] ?? 0;
                    return ` ${fnFormatPercent(pct, { decimals: 1 })} (${rawCount.toLocaleString()} runs)`;
                  }
                  return ` ${rawCount.toLocaleString()}`;
                }
              }
            }
          },
          scales: {
            x: {
              title: { display: !!xAxisLabel, text: xAxisLabel, color: '#a0a0a0', font: { size: 11 } },
              ticks: { color: '#a0a0a0', font: { size: 11 } },
              grid: { display: false }
            },
            y: {
              title: { display: !!yAxisLabel, text: yAxisLabel, color: '#a0a0a0', font: { size: 11 } },
              beginAtZero: true,
              ticks: {
                color: '#a0a0a0',
                font: { size: 11 },
                callback: (value) => isPercentageMode ? `${value}%` : value.toLocaleString()
              },
              grid: { color: '#2e2e2e' }
            }
          }
        }
      });
    });
  }

  // reading the props here tells svelte to re-run this effect whenever any prop changes (also fires once on initial mount)
  $effect(() => {
    barLabels;
    barValues;
    displayMode;
    barColor;
    xAxisLabel;
    yAxisLabel;
    fnBuildBarChart();
    // cleanup runs before the next effect re-run AND on component unmount, so the previous chart is always destroyed before a new one is built on the same canvas
    return () => chartInstance?.destroy();
  });
</script>

<div class="bar-wrap">

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
  .bar-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 1rem;
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    width: 100%;
    height: 350px;
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
