<script>
  import { onMount } from 'svelte';

  let { distribution: distributionMap = {}, title: chartTitle = '' } = $props();

  let canvasElement;
  let chartInstance;

  const GREYSCALE_PALETTE = [
    '#ffffff', '#cccccc', '#aaaaaa', '#888888',
    '#666666', '#444444', '#333333', '#222222'
  ];

  function fnBuildPieChart() { // called from onMount below + the distribution-change $effect below
    if (!canvasElement) return;
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
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#a0a0a0',
                font: { size: 11 },
                boxWidth: 12,
                padding: 12
              }
            },
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
  <canvas bind:this={canvasElement}></canvas>
  {#if chartTitle}
    <p class="chart-title">{chartTitle}</p>
  {/if}
</div>

<style>
  .pie-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
  }

  canvas {
    max-width: 260px;
    width: 100%;
  }

  .chart-title {
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-muted);
    margin-top: 0.25rem;
  }
</style>
