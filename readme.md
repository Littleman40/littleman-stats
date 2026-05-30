# Littleman Stats

This is a data driven website built as my Year 12 NSW Enterprise Computing Major Project. This project aims to use public api endpoints, to allow users to find statistics about themselves and others, for No Hesi servers. Furthermore, it will contain a Help-FAQ section, and the ability to filter the global leaderboard.

## Current Features
- [x] Leaderboard Filters
- [x] Searchable FAQ's
- [x] Per User Search 
- [x] Ranks
- [x] Leaderboard Statistics

## Upcoming Features
- [ ] Score Predictor / Analysis

## Screenshots
<img src="https://i.imgur.com/9So0gy2.png" width=400> <img src="https://i.imgur.com/UobIcCU.png" width=400> 
<img src="https://i.imgur.com/bMVtyHb.png" width=400> <img src="https://i.imgur.com/10F5dnR.png" width=400>  

## Tech stack (so far)

- **SvelteKit**: https://kit.svelte.dev/
- **Svelte 5**: https://svelte.dev/
- **Vite**: https://vite.dev/
- **Chart.js**: https://www.chartjs.org/

## Run it locally

1. **clone/download the repo**
2. **install dependencies**
   ```bash
   npm install
   ```
3. **scrape the data for statistics**
   ```bash
   node scripts/scrape-stats.js
   ```
4. **start the dev server**
   ```bash
   npm run dev
   ```