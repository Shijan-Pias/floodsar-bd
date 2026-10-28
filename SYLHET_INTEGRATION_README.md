# FloodSAR BD — Sylhet 2022 React integration patch

## Files in this patch
- `src/data/events.json`: Sylhet bbox updated to the frozen analysis-grid bounds.
- `src/data/stats.json`: stale Sylhet sample measurements removed; measured summary is kept in the dedicated stats file.
- `src/components/MapView.jsx`: correct Sylhet tile root and legend colors/layers for the five generated XYZ layers.
- `src/components/StatsPanel.jsx`: loads the corrected Sylhet statistics path and uses explicit positive-overlap labels/caveats.
- `src/api/floodApi.js`: loads and validates the new Sylhet statistics file.
- `public/data/floodsar/2022/sylhet/stats_sylhet.json`: audited statistics used by StatsPanel.

## Install
Extract this ZIP into the project root `D:\Nasa\floodsar-bd`, preserving the folder structure. Allow the five source files to be replaced when prompted.

The five XYZ tile folders and `manifest.json` should already exist at:
`public/data/floodsar/2022/sylhet/`

This patch adds `stats_sylhet.json` to that same directory.

## Verify
From PowerShell:
```powershell
cd D:\Nasa\floodsar-bd
npm run lint
npm run build
npm run dev
```

Test both `sylhet-2022` and `feni-noakhali-2024`. Sunamganj remains unsupported until its Priority-1 package is prepared.

## Scientific interpretation
- Candidate gains are exploratory Sentinel-1 backscatter transitions, not confirmed flood extent.
- GFM agreement is not independent ground-truth accuracy.
- ALOS-2 polygons are positive detections only; absent polygons are not verified dry land.
- ML predictions are trained on GFM-derived labels and are not independently validated flood extent.
