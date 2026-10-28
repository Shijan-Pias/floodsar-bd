FloodSAR BD - corrected Sylhet 2022 transparent overlays

Copy the extracted tiles/ folder and manifest.json into:
public/data/floodsar/2022/sylhet/

DO NOT delete or overwrite your existing stats_sylhet.json.
The statistics and science have not been recalculated.
No MapView.jsx modification is needed when these RGBA tiles are used.
All tiles are XYZ PNG (EPSG:3857), z=6-13, RGBA with alpha=0 outside positives.
The GFM, ALOS-2, and candidate layers are satellite products, not ground truth.
