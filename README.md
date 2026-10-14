# Route Lab — Open TSP vs Closed TSP

A static React + TypeScript + Vite playground comparing two exact Held–Karp solutions around Greater Jakarta. MapLibre displays a Blok M origin and eight numbered waypoints immediately. Optimization runs only after clicking **Optimize Routes**.

## Run locally

Use Node.js 22.12 or newer for development and CI. The repository includes an `.nvmrc` file. If you use nvm, select the project runtime before installing dependencies or starting Vite:

```sh
nvm install
nvm use
npm ci
npm run dev
```

If startup reports that `node:util` does not export `styleText`, your shell is using an older Node version. Run `nvm use` in this directory and check `node --version` before retrying.

```sh
npm test
npm run build
npm run preview
```

## Explore

Drag markers, edit names or coordinates under **Edit locations**, remove stops, or click **Add waypoint** and then the map (maximum eight). Reset restores the Jakarta scenario. Coordinate edits mark existing comparison results as previous results until the next optimization. Both result maps retain the input snapshot used to calculate them.

**Share scenario** copies a URL containing the origin, waypoint names and coordinates, and metric in the URL fragment. Opening it loads the inputs without running«\ optimization. Invalid fragments fall back to the demo.

## Distance model and algorithm

All costs are geographic great-circle distances in kilometers using the haversine formula and Earth radius 6,371 km. Map lines connect points directly; they are not driving directions. No travel duration or road-routing data is inferred. Geographic distance is the single supported optimization metric, and is preserved in shared URLs.

For each subset S and endpoint j, Held–Karp computes D[S,j] = min(D[S−{j},k] + cost[k,j]). Closed TSP minimizes the full-subset cost plus the edge back to the origin. Open TSP minimizes the full-subset cost without that edge. Parent pointers reconstruct the route. Each solver runs separately against the same matrix in O(n² 2ⁿ) time and O(n 2ⁿ) space. Runtime is measured for each solver only, excluding matrix construction and rendering. Equivalent reversed closed tours can exist.

The tests compare both variants with exhaustive permutation search, including asymmetric matrices, verify route reconstruction and special cases, validate scenario sharing, and check that the default eight-stop example changes waypoint order rather than simply deleting the return leg.

## Deploy

`npm run build` outputs a standalone `dist/` directory. Upload it to any static host. Vite's relative base supports deployment under a repository subpath. No backend, API key, or account is required to use the demo.

For GitHub Pages, set repository **Settings → Pages → Source** to **GitHub Actions**, and push to `main` or manually run the supplied deployment workflow. It runs tests and builds before publishing. Hosting has not been activated by this repository setup.

The browser downloads OpenStreetMap raster tiles and optional Google Fonts; optimization remains local. Tile availability requires internet access, and OpenStreetMap's public tile usage policy applies. Coordinates can also be edited without the map. The UI reports tile failures and retains functional coordinate controls. A WebGL-capable browser is needed for the maps. User inputs and shared URL fragments stay in the browser.
