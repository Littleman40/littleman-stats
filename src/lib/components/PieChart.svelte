<script>
  import { onMount } from 'svelte';

  let { distribution = {}, title = '' } = $props();

  let canvas;
  let chart;

  const GREYSCALE = [
    '#ffffff', '#cccccc', '#aaaaaa', '#888888',
    '#666666', '#444444', '#333333', '#222222'
  ];

  function buildChart() {
    if (!canvas) return;
    if (chart) chart.destroy();

    const labels = Object.keys(distribution);
    const data = Object.values(distribution);

    import('chart.js/auto').then(({ Chart }) => {
      chart = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: labels.map((_, i) => GREYSCALE[i % GREYSCALE.length]),
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
                label: (ctx) => ` ${ctx.label}: ${ctx.parsed.toLocaleString()}`
              }
            }
          }
        }
      });
    });
  }

  onMount(() => {
    buildChart();
    return () => chart?.destroy();
  });

  $effect(() => {
    distribution;
    buildChart();
  });
</script>

<div class="pie-wrap">
  <canvas bind:this={canvas}></canvas>
  {#if title}
    <p class="chart-title">{title}</p>
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
