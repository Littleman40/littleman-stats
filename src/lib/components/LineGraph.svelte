<script>
  // used to ensures the canvas exists before Chart.js tries to draw on it.
  import { onMount } from 'svelte';
  
  // local variables
  let {
    data: singleData = null, 
    multiData = null 
  } = $props();

  let canvasElement;
  let chartInstance;

  // called from fnBuildLineChart to build the chart.js object
  function fnBuildScatterOptions(isMulti) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: isMulti,
          labels: {
            color: '#a0a0a0',
            font: { size: 10 },
            boxWidth: 7,
            boxHeight: 7,
            padding: 10,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          callbacks: {
            label: (tooltipCtx) => isMulti
              ? ` ${tooltipCtx.dataset.label}: ${tooltipCtx.parsed.y.toLocaleString()}`
              : ` ${tooltipCtx.parsed.y.toLocaleString()}`
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          ticks: {
            color: '#a0a0a0',
            font: { size: 11 },
            maxTicksLimit: 10,
            callback: (timestampMs) => {
            const date = new Date(timestampMs);

            const day = date.getDate();
            const month = date.toLocaleString('en-AU', { month: 'short' });

            // changes dates to include the 1"st" may of the month instead of saying 1 may etc
            const fnOrdinal = (n) => {
              if (n > 3 && n < 21) return `${n}th`;

              switch (n % 10) {
                case 1: return `${n}st`;
                case 2: return `${n}nd`;
                case 3: return `${n}rd`;
                default: return `${n}th`;
              }
            };

            return `${fnOrdinal(day)} ${month}`;
          }
          },
          grid: { color: '#2e2e2e' }
        },
        y: {
        ticks: {
          color: '#a0a0a0',
          font: { size: 11 },
          callback: (value) => {
          const abs = Math.abs(value);

          // makes it so instead of listing 1000000 it says 1mil
          if (abs >= 1_000_000_000) {
            return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'bil';
          }

          if (abs >= 1_000_000) {
            return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'mil';
          }

          if (abs >= 1_000) {
            return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
          }

          return value.toLocaleString();
        }
        },
        grid: { color: '#2e2e2e' }
      }
      }
    };
  }

  // converts the api-shaped [{submitted_at, score}] into chart.js scatter points
  function fnToScatterPoints(runArray) {
    return [...runArray]
      .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at))
      .map((run) => ({ x: new Date(run.submitted_at).getTime(), y: run.score }));
  }

  // called from onMount below + the data-change $effect below
  function fnBuildLineChart() {
    if (!canvasElement) return;
    if (chartInstance) chartInstance.destroy();

    const isMulti = multiData && (multiData.solo?.length || multiData.crew?.length);
    const singleArray = singleData ?? [];

    if (!isMulti && !singleArray.length) return;

    // lazy import so Chart.js isn't bundled into the initial page load
    import('chart.js/auto').then(({ Chart }) => {
      if (isMulti) {
        const datasets = [];

        if (multiData.solo?.length) {
          datasets.push({
            label: 'Solo',
            data: fnToScatterPoints(multiData.solo),
            backgroundColor: '#ffffff',
            borderColor: '#000000',
            borderWidth: 1,
            pointRadius: 4,
            pointHoverRadius: 6
          });
        }

        if (multiData.crew?.length) {
          datasets.push({
            label: 'Crew',
            data: fnToScatterPoints(multiData.crew),
            backgroundColor: '#34d399',
            borderColor: '#000000',
            borderWidth: 1,
            pointRadius: 4,
            pointHoverRadius: 6
          });
        }

        chartInstance = new Chart(canvasElement, {
          type: 'scatter',
          data: { datasets },
          options: fnBuildScatterOptions(true)
        });
      } else {
        chartInstance = new Chart(canvasElement, {
          type: 'scatter',
          data: {
            datasets: [{
              label: 'Score',
              data: fnToScatterPoints(singleArray),
              backgroundColor: '#ffffff',
              borderColor: '#000000',
              borderWidth: 1,
              pointRadius: 4,
              pointHoverRadius: 6
            }]
          },
          options: fnBuildScatterOptions(false)
        });
      }
    });
  }

  onMount(() => {
    fnBuildLineChart();
    return () => chartInstance?.destroy();
  });

  $effect(() => {
    singleData;
    multiData;
    fnBuildLineChart();
  });
</script>

<div class="graph-wrap">
  <canvas bind:this={canvasElement}></canvas>
</div>

<style>
  .graph-wrap {
    width: 100%;
    height: 300px;
    padding: 1rem;
    background: var(--color-card-elevated);
    border: 1px solid rgb(44, 44, 44);
    border-radius: 0.4rem;
  }

  canvas {
    width: 100% !important;
    height: 100% !important;
  }
</style>
