<script>
  // local variables
  let {
    points: scatterPoints = [],
    color: pointColor = '#ffffff',
    title: chartTitle = '',
    xLabel: xAxisLabel = '',
    yLabel: yAxisLabel = ''
  } = $props();

  let canvasElement = $state();
  let chartInstance;

  const hasData = $derived(scatterPoints.length > 0);

  function fnBuildScatterChart() {
    if (!canvasElement || !hasData) return;
    if (chartInstance) chartInstance.destroy();

    // copy each point into the {x, y} shape chart.js expects
    const pointsCopy = scatterPoints.map((point) => ({ x: point.x, y: point.y }));

    // lazy import so chart.js isn't bundled into the initial page load
    import('chart.js/auto').then(({ Chart }) => {
      chartInstance = new Chart(canvasElement, {
        type: 'scatter',
        data: {
          datasets: [{
            data: pointsCopy,
            backgroundColor: pointColor,
            pointRadius: 4,
            pointHoverRadius: 6
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
                // tooltip spells out both axis values for the hovered point
                label: (tooltipCtx) => ` ${xAxisLabel || 'x'}: ${tooltipCtx.parsed.x}, ${yAxisLabel || 'y'}: ${tooltipCtx.parsed.y}`
              }
            }
          },
          scales: {
            x: {
              title: { display: !!xAxisLabel, text: xAxisLabel, color: '#a0a0a0', font: { size: 11 } },
              beginAtZero: true,
              ticks: { color: '#a0a0a0', font: { size: 11 } },
              grid: { color: '#2e2e2e' }
            },
            y: {
              title: { display: !!yAxisLabel, text: yAxisLabel, color: '#a0a0a0', font: { size: 11 } },
              beginAtZero: true,
              ticks: { color: '#a0a0a0', font: { size: 11 } },
              grid: { color: '#2e2e2e' }
            }
          }
        }
      });
    });
  }

  // reading the props here tells svelte to re-run this effect whenever any prop changes
  $effect(() => {
    scatterPoints;
    pointColor;
    xAxisLabel;
    yAxisLabel;
    fnBuildScatterChart();
    // cleanup runs before the next effect re-run AND on component unmount, so the previous chart is always destroyed before a new one is built on the same canvas
    return () => chartInstance?.destroy();
  });
</script>

<div class="scatter-wrap">

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
  .scatter-wrap {
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
