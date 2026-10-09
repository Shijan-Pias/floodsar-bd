# FloodSAR BD

Radar sees the flood through the clouds.

A web application for the NASA Space Apps Challenge 2026 Bangladesh ("Dancing with the SARs"). It maps flood extent in Bangladesh by comparing two Sentinel-1 SAR-derived water masks (NASA OPERA DSWx-S1, via NASA Earthdata / ASF DAAC) before and after a monsoon flood, and reports the newly inundated area.

## Current State

The frontend currently uses sample data until the backend API is connected. The mock data layer is encapsulated in `src/api/floodApi.js`. Once a backend is available, only the contents of this file need to be updated to switch from sample data to live API calls.

## How to Run

Ensure you have Node.js installed.

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to the URL shown in the terminal (usually `http://localhost:5173`).

## Data Sources

- NASA Earthdata
- ASF DAAC
- Sentinel-1 / ESA Copernicus
- OPERA

## License

Licensed under the Apache License, Version 2.0. See the `LICENSE` file for details.
