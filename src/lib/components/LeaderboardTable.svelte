<script>
  // importing the format score function to be used later in the table
  import { fnFormatScore } from '$lib/utils/formatters.js';

  // local variables
  let {
    records: leaderboardRecords = [],
    activeFilter = 'all', 
    startRank = 1 
  } = $props(); 
</script>

<div class="table-wrap">
  <table>
    <!-- fixed table widths so skeleton headers stay in same position-->
    <colgroup>
      <col style="width: 90px"/>
      <col style="width: 389px"/>
      <col style="width: 146px"/>
      <col style="width: 103px"/>
      <col style="width: 109px"/>
      <col style="width: 82px"/>
      <col style="width: 67px"/>
      <col style="width: 227px"/>
    </colgroup>
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

      <!-- each lb entry -->
      {#each leaderboardRecords as runRecord, rowIndex}
        
      <tr>
          <td class="pos">
            
            <!-- only show real position for all filter-->
            {#if activeFilter === 'all'}
              {runRecord.rank_position ?? startRank + rowIndex}

            <!-- show relative position and real position for other filters -->
            {:else}
              {startRank + rowIndex} ({runRecord.rank_position ?? startRank + rowIndex})
            {/if}

          </td>
          
          <!-- the player cell section -->
          <td class="player-cell">
            <div class="player">
              
              {#if runRecord.mode === 'team'}

                <!-- if its a crew run, display the number of people in the crew - or go to 0 for any null data -->
                <div class="player-names">
                  <span class="team-members">{(runRecord.team_members?.length ?? 0)} Player Crew</span>
                  
                  {#if runRecord.team_members?.length}
                    <span class="crew-list">
                      
                      {#each runRecord.team_members as member, i}
                        <span class="crew-member">
                          
                          {#if member.pfp}
                            <img src={member.pfp} alt="" class="crew-pfp" />
                          
                            {:else}
                            <div class="crew-pfp crew-pfp-placeholder"></div>
                          
                            {/if}
                          {member.name}{i < runRecord.team_members.length - 1 ? ',' : ''}
                        </span>

                      {/each}
                    </span>
                  
                  {/if}
                </div>

              {:else}

                <!-- solo runs display profile picture and then the player name -->
                {#if runRecord.nohesi_pfp}
                  <img src={runRecord.nohesi_pfp} alt="" class="pfp" />
                
                {:else}
                  <div class="pfp-placeholder"></div>
                
                {/if}
                <div class="player-names">
                  <span class="player-name">{runRecord.nohesi_name}</span>
                </div>

              {/if}
            </div>
          </td>
          
          <!-- formats the score to include , for each hundredth -->
          <td class="num">{fnFormatScore(runRecord.score)}</td>
          
          <td class="num">{runRecord.combo}</td>
          
          <td>{runRecord.map}</td>
          
          <td>{runRecord.traffic_type}</td>
          
          <!-- the api returns crew runs as 'team' runs, so we change it on display to the user -->
          <td>{runRecord.mode === 'team' ? 'Crew' : 'Solo'}</td>
          
          <td class="car">{runRecord.car_model}</td>
        
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .table-wrap {
    width: 100%;
  }

  table {
    table-layout: fixed;
    width: 100%;
    min-width: 1213px;
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
    overflow: hidden;
    white-space: nowrap;
    -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 24px), transparent);
    mask-image: linear-gradient(to right, #000 calc(100% - 24px), transparent);
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
    min-width: 0;
  }

  .player-name {
    font-weight: 500;
  }

  .team-members {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .crew-list {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .crew-member {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    white-space: nowrap;
    font-weight: 500;
  }

  .crew-pfp {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
    object-fit: cover;
  }

  .crew-pfp-placeholder {
    background: var(--color-card-raised);
    border: 1px solid var(--color-border);
  }

  .num {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .car {
    color: var(--color-muted);
    font-size: 0.8rem;
  }
</style>