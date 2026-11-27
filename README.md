# India EMS Navigator — Chennai | Advanced White Dashboard

Academic prototype for dynamic ambulance route optimization using A* and Greedy Best-First Search.

## Run locally
Open `index.html` in a modern browser or use VS Code Live Server. Internet access is required for OpenStreetMap tiles, Nominatim search and Overpass road data.

## GitHub Pages deployment
1. Create a public repository named `india-ems-navigator`.
2. Upload `index.html`, `style.css`, `app.js`, and `README.md` to its root.
3. Open Settings → Pages.
4. Choose Deploy from a branch, branch `main`, folder `/(root)`, then Save.
5. Share `https://YOUR-USERNAME.github.io/india-ems-navigator/` after deployment.

## Features
- Responsive white emergency operations dashboard.
- Chennai interactive map and location search.
- Select accident and hospital/destination by map click or search.
- OpenStreetMap road graph through Overpass API.
- Custom A* and Greedy Best-First Search.
- Route distance, estimated time and algorithm comparison.
- Adjustable traffic multiplier for demonstration.

## Limitations and safety
Traffic is simulated, not live. Road speeds are estimates based on OSM road classes and maxspeed tags. Hospital capacity, ambulance restrictions, closures and real-time conditions are not verified. This is an educational prototype, not certified emergency navigation. For emergencies in India call 112. Map data © OpenStreetMap contributors (ODbL). Respect public Nominatim and Overpass usage policies.
