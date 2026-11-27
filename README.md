# India EMS Navigator — Chennai

An academic web prototype for **Dynamic Ambulance Route Optimization Using A* and Greedy Best-First Search Based on Traffic and Road Conditions**.

Users choose an accident location and a destination hospital (or another destination) in Chennai. The application downloads a local OpenStreetMap road graph and runs two pathfinding algorithms in the browser.

## Features

- Interactive Chennai map using Leaflet and OpenStreetMap tiles.
- Select start and destination by map click or place-name search.
- Road graph retrieved from the Overpass API.
- Custom A* and Greedy Best-First Search implementations.
- Estimated route distance and travel time.
- Demo traffic multiplier (normal, moderate, heavy).
- Side-by-side algorithm results and route overlays.
- Responsive desktop and mobile layout.

## Run locally

No Python or Node installation is required.

1. Download or clone this repository.
2. Open `index.html` in a modern browser, or use VS Code Live Server.
3. Select an accident location and a hospital/destination.
4. Click **Calculate optimal routes**.

Internet access is required for map tiles, geocoding and road-network data.

## Publish a live demo with GitHub Pages

1. Create a new **public** repository on GitHub, for example `india-ems-navigator`.
2. Upload `index.html`, `style.css`, `app.js`, and `README.md` to the repository root.
3. Open the repository's **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch **main** and folder **/(root)**, then click **Save**.
6. Wait for GitHub Pages to publish. Your website URL will look like:
   `https://YOUR-GITHUB-USERNAME.github.io/india-ems-navigator/`

The URL will be public. Share it with your teacher and friends. GitHub Pages may take a few minutes to publish after the first setup.

## Data and algorithm notes

- Map display and road data: © OpenStreetMap contributors.
- Geocoding: Nominatim.
- Road graph: Overpass API.
- The A* implementation uses estimated travel-time edge cost plus a straight-line distance heuristic.
- Greedy Best-First Search prioritizes straight-line distance to the goal; its route is not guaranteed to be optimal.
- Road speeds are approximations based on OSM road classes and optional `maxspeed` tags.
- The traffic selector applies a global demonstration multiplier. It is **not live traffic**.
- This prototype does not verify hospital operating status, emergency department capacity, ambulance restrictions, or real-time closures.

## Important safety disclaimer

This is an educational demonstration, not a certified emergency navigation or dispatch system. Do not use it to direct a real ambulance or make medical decisions. In India, call **112** for emergencies or use the locally authorized emergency service.

## Attribution

© OpenStreetMap contributors. Map data is available under the Open Database License (ODbL). Respect the usage policies of public Nominatim and Overpass services; avoid high-volume requests.
