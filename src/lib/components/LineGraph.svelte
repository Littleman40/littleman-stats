<script>
  import { onMount } from 'svelte';

  let { data = [] } = $props();

  let canvas;
  let chart;

  function buildChart() {
    if (!canvas || !data.length) return;
    if (chart) chart.destroy();

    const sorted = [...data].sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));
    const labels = sorted.map(d => new Date(d.submitted_at).toLocaleDateString());
    const scores = sorted.map(d => d.score);

    import('chart.js/auto').then(({ Chart }) => {
      chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Score',
            data: scores,
            borderColor: '#ffffff',
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 2,
            pointRadius: 2,
            pointBackgroundColor: '#ffffff',
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.parsed.y.toLocaleString()}`
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#a0a0a0', font: { size: 11 }, maxTicksLimit: 10 },
              grid: { color: '#2e2e2e' }
            },
            y: {
              ticks: {
                color: '#a0a0a0',
                font: { size: 11 },
                callback: (v) => v.toLocaleString()
              },
              grid: { color: '#2e2e2e' }
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
    data;
    buildChart();
  });
</script>

<div class="graph-wrap">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .graph-wrap {
    width: 100%;
    padding: 1rem;
    background: var(--color-card-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
  }

  canvas {
    width: 100% !important;
  }
</style>
