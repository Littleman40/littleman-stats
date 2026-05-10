<script>
  import { formatScore } from '$lib/utils/formatters.js';

  let { records = [] } = $props();
</script>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th>Position</th>
        <th>Player</th>
        <th>Score</th>
        <th>Combo</th>
        <th>Map</th>
        <th>Traffic</th>
        <th>Mode</th>
        <th>Car</th>
      </tr>
    </thead>
    <tbody>
      {#each records as record, i}
        <tr>
          <td class="pos">{record.rank_position ?? i + 1}</td>
          <td class="player-cell">
            <div class="player">
              {#if record.nohesi_pfp}
                <img src={record.nohesi_pfp} alt="" class="pfp" />
              {:else}
                <div class="pfp-placeholder"></div>
              {/if}
              <div class="player-names">
                <span class="player-name">{record.nohesi_name}</span>
                {#if record.mode === 'team' && record.team_names?.length}
                  <span class="team-members">{record.team_names.join(', ')}</span>
                {/if}
              </div>
            </div>
          </td>
          <td class="num">{formatScore(record.score)}</td>
          <td class="num">{record.combo}</td>
          <td>{record.map}</td>
          <td>{record.traffic_type}</td>
          <td>{record.mode === 'team' ? 'Team' : 'Solo'}</td>
          <td class="car">{record.car_model}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .table-wrap {
    width: 100%;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  thead th {
    text-align: left;
    padding: 0.6rem 0.75rem;
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-muted);
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }

  tbody tr {
    border-bottom: 1px solid var(--color-border);
    transition: background 0.1s;
  }

  tbody tr:nth-child(odd) {
    background: var(--color-card);
  }

  tbody tr:nth-child(even) {
    background: var(--color-card-elevated);
  }

  tbody tr:hover {
    background: var(--color-card-raised);
  }

  td {
    padding: 0.65rem 0.75rem;
    color: var(--color-text);
    vertical-align: middle;
  }

  .pos {
    color: var(--color-muted);
    font-size: 0.8rem;
    min-width: 50px;
  }

  .player-cell {
    min-width: 160px;
  }

  .player {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .pfp,
  .pfp-placeholder {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    flex-shrink: 0;
    object-fit: cover;
  }

  .pfp-placeholder {
    background: var(--color-card-raised);
    border: 1px solid var(--color-border);
  }

  .player-names {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .player-name {
    font-weight: 500;
  }

  .team-members {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .num {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .car {
    color: var(--color-muted);
    font-size: 0.8rem;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
