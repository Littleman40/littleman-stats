<script>
  import { onMount } from 'svelte';

  let { data: runData = [] } = $props();

  let canvasElement;
  let chartInstance;

  function fnBuildLineChart() { // called from onMount below + the data-change $effect below
    if (!canvasElement || !runData.length) return;
    if (chartInstance) chartInstance.destroy();

    const sortedRuns = [...runData].sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));
    const dateLabels = sortedRuns.map((run) => new Date(run.submitted_at).toLocaleDateString());
    const scoreSeries = sortedRuns.map((run) => run.score);

    import('chart.js/auto').then(({ Chart }) => {
      chartInstance = new Chart(canvasElement, {
        type: 'line',
        data: {
          labels: dateLabels,
          datasets: [{
            label: 'Score',
            data: scoreSeries,
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
                label: (tooltipCtx) => ` ${tooltipCtx.parsed.y.toLocaleString()}`
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
                callback: (tickValue) => tickValue.toLocaleString()
              },
              grid: { color: '#2e2e2e' }
            }
          }
        }
      });
    });
  }

  onMount(() => {
    fnBuildLineChart();
    return () => chartInstance?.destroy();
  });

  $effect(() => {
    runData;
    fnBuildLineChart();
  });
</script>

<div class="graph-wrap">
  <canvas bind:this={canvasElement}></canvas>
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
