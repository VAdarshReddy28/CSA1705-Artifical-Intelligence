
// ==========================================
// MEDIROUTE - AMBULANCE ROUTE OPTIMIZATION
// ==========================================

// 1. ROAD NETWORK

const nodes = {
    A: { name: "City Center", x: 100, y: 250 },
    B: { name: "Railway Station", x: 280, y: 100 },
    C: { name: "Bus Stand", x: 280, y: 420 },
    D: { name: "Central Junction", x: 470, y: 250 },
    E: { name: "North Care Hospital", x: 700, y: 90 },
    F: { name: "Apollo Hospital", x: 750, y: 420 },
    G: { name: "Market Junction", x: 480, y: 480 },
    H: { name: "Government Hospital", x: 900, y: 250 }
};

const roads = [
    { a: "A", b: "B", distance: 5, congestion: 1 },
    { a: "A", b: "C", distance: 6, congestion: 0 },
    { a: "A", b: "D", distance: 8, congestion: 2 },
    { a: "B", b: "D", distance: 5, congestion: 0 },
    { a: "B", b: "E", distance: 7, congestion: 1 },
    { a: "C", b: "D", distance: 5, congestion: 1 },
    { a: "C", b: "G", distance: 7, congestion: 0 },
    { a: "D", b: "E", distance: 6, congestion: 1 },
    { a: "D", b: "F", distance: 7, congestion: 2 },
    { a: "D", b: "G", distance: 4, congestion: 0 },
    { a: "E", b: "H", distance: 5, congestion: 0 },
    { a: "F", b: "G", distance: 3, congestion: 1 },
    { a: "F", b: "H", distance: 6, congestion: 1 },
    { a: "G", b: "H", distance: 8, congestion: 0 }
];

const trafficSettings = {
    low: { factor: 1, speed: 45 },
    medium: { factor: 1.25, speed: 30 },
    high: { factor: 1.6, speed: 18 }
};

let selectedRoute = null;
let animationTimer = null;
let animationStep = 0;
let lastComparison = null;


// 2. CREATE ADJACENCY LIST

function buildGraph(traffic, blockedRoad) {

    const graph = {};

    Object.keys(nodes).forEach(id => {
        graph[id] = [];
    });

    roads.forEach(road => {

        const roadId = road.a + road.b;
        const reverseId = road.b + road.a;

        if (
            blockedRoad === roadId ||
            blockedRoad === reverseId
        ) {
            return;
        }

        const congestionFactor =
            1 + road.congestion * trafficSettings[traffic].factor * 0.12;

        const cost = road.distance * congestionFactor;

        graph[road.a].push({
            node: road.b,
            cost: cost,
            distance: road.distance
        });

        graph[road.b].push({
            node: road.a,
            cost: cost,
            distance: road.distance
        });

    });

    return graph;
}


// 3. HEURISTIC FUNCTION

function heuristic(node, destination) {

    const p1 = nodes[node];
    const p2 = nodes[destination];

    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;

    return Math.sqrt(dx * dx + dy * dy) * 0.01;
}


// 4. A* AND GREEDY SEARCH

function findPath(start, end, algorithm, traffic, blockedRoad) {

    const graph = buildGraph(traffic, blockedRoad);

    const open = [{
        node: start,
        path: [start],
        cost: 0,
        distance: 0
    }];

    const visited = new Set();

    let explored = 0;

    while (open.length > 0) {

        open.sort((a, b) => {

            const scoreA = algorithm === "astar"
                ? a.cost + heuristic(a.node, end)
                : heuristic(a.node, end);

            const scoreB = algorithm === "astar"
                ? b.cost + heuristic(b.node, end)
                : heuristic(b.node, end);

            return scoreA - scoreB;
        });

        const current = open.shift();

        if (visited.has(current.node)) {
            continue;
        }

        visited.add(current.node);
        explored++;

        if (current.node === end) {

            return {
                path: current.path,
                cost: current.cost,
                distance: current.distance,
                explored: explored
            };
        }

        for (const edge of graph[current.node]) {

            if (!visited.has(edge.node)) {

                open.push({
                    node: edge.node,
                    path: [
                        ...current.path,
                        edge.node
                    ],
                    cost: current.cost + edge.cost,
                    distance: current.distance + edge.distance
                });
            }
        }
    }

    return null;
}


// 5. CALCULATE TRAVEL TIME

function calculateTime(route, traffic) {

    if (!route) return 0;

    const speed = trafficSettings[traffic].speed;
    const weightedDistance = route.cost;

    return (weightedDistance / speed) * 60;
}


// 6. EXECUTION TIME HELPER

function calculateAlgorithm(start, end, algorithm, traffic, blocked) {

    const startTime = performance.now();

    const result = findPath(
        start,
        end,
        algorithm,
        traffic,
        blocked
    );

    const executionTime = performance.now() - startTime;

    return {
        ...result,
        executionTime: executionTime
    };
}


// 7. MAIN ROUTE CALCULATION

function calculateRoute() {

    stopAnimation();

    const start = document.getElementById("start").value;
    const end = document.getElementById("end").value;
    const algorithm = document.getElementById("algorithm").value;
    const traffic = document.getElementById("traffic").value;
    const blocked = document.getElementById("blocked-road").value;

    if (start === end) {
        alert("Starting location and destination must be different.");
        return;
    }

    const route = calculateAlgorithm(
        start, end, algorithm, traffic, blocked
    );

    if (!route) {

        selectedRoute = null;

        document.getElementById("route-output").innerHTML =
            "<p class='empty-message'>No available route. Please change the road conditions.</p>";

        document.getElementById("metric-distance").textContent = "--";
        document.getElementById("metric-time").textContent = "--";
        document.getElementById("metric-nodes").textContent = "--";
        document.getElementById("metric-execution").textContent = "--";

        document.getElementById("simulate-btn").disabled = true;
        document.getElementById("pause-btn").disabled = true;

        drawMap();

        return;
    }

    selectedRoute = route;

    const time = calculateTime(route, traffic);

    const algorithmName = algorithm === "astar"
        ? "A* Search"
        : "Greedy Best-First Search";

    const names = route.path.map(id => nodes[id].name);

    document.getElementById("route-output").innerHTML = `
        <div class="route-description">SELECTED OPTIMIZATION ALGORITHM</div>

        <h3>${algorithmName}</h3>

        <div class="route-path">
            ${names.join(" → ")}
        </div>

        <p class="route-description">
            ${route.path.length} route nodes selected
        </p>

        <p class="route-description">
            Route cost: ${route.cost.toFixed(2)}
        </p>
    `;

    document.getElementById("metric-distance").textContent =
        route.distance.toFixed(2) + " km";

    document.getElementById("metric-time").textContent =
        time.toFixed(1) + " min";

    document.getElementById("metric-nodes").textContent =
        route.explored;

    document.getElementById("metric-execution").textContent =
        route.executionTime.toFixed(3) + " ms";

    document.getElementById("metric-traffic").textContent =
        traffic.toUpperCase();

    document.getElementById("simulate-btn").disabled = false;
    document.getElementById("pause-btn").disabled = false;

    drawMap();

    document.getElementById("results").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


// 8. ALGORITHM COMPARISON

function compareAlgorithms() {

    const start = document.getElementById("start").value;
    const end = document.getElementById("end").value;
    const traffic = document.getElementById("traffic").value;
    const blocked = document.getElementById("blocked-road").value;

    if (start === end) {
        alert("Please choose different locations.");
        return;
    }

    const astar = calculateAlgorithm(
        start, end, "astar", traffic, blocked
    );

    const greedy = calculateAlgorithm(
        start, end, "greedy", traffic, blocked
    );

    lastComparison = { astar, greedy };

    function display(id, value) {
        document.getElementById(id).textContent = value;
    }

    display(
        "astar-route",
        astar ? astar.path.join(" → ") : "No route"
    );

    display(
        "greedy-route",
        greedy ? greedy.path.join(" → ") : "No route"
    );

    display(
        "astar-distance",
        astar ? astar.distance.toFixed(2) + " km" : "--"
    );

    display(
        "greedy-distance",
        greedy ? greedy.distance.toFixed(2) + " km" : "--"
    );

    display(
        "astar-time",
        astar ? calculateTime(astar, traffic).toFixed(1) + " min" : "--"
    );

    display(
        "greedy-time",
        greedy ? calculateTime(greedy, traffic).toFixed(1) + " min" : "--"
    );

    display(
        "astar-nodes",
        astar ? astar.explored : "--"
    );

    display(
        "greedy-nodes",
        greedy ? greedy.explored : "--"
    );

    display(
        "astar-execution",
        astar ? astar.executionTime.toFixed(3) + " ms" : "--"
    );

    display(
        "greedy-execution",
        greedy ? greedy.executionTime.toFixed(3) + " ms" : "--"
    );

    document.getElementById("comparison").scrollIntoView({
        behavior: "smooth"
    });
}


// 9. DRAW ROAD NETWORK

function drawMap() {

    const canvas = document.getElementById("road-map");
    const ctx = canvas.getContext("2d");

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const scale = Math.min(width / 1000, height / 550);

    const offsetX = (width - 1000 * scale) / 2;
    const offsetY = (height - 550 * scale) / 2;

    const px = x => offsetX + x * scale;
    const py = y => offsetY + y * scale;

    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;

    ctx.setTransform(
        devicePixelRatio, 0,
        0, devicePixelRatio, 0, 0
    );

    ctx.fillStyle = "#111e30";
    ctx.fillRect(0, 0, width, height);

    // Background grid

    ctx.strokeStyle = "#1d2c40";
    ctx.lineWidth = 1;

    for (let x = 0; x < width; x += 35) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    for (let y = 0; y < height; y += 35) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    const traffic = document.getElementById("traffic").value;
    const blocked = document.getElementById("blocked-road").value;

    // Draw roads

    roads.forEach(road => {

        const roadId = road.a + road.b;

        const isBlocked =
            blocked === roadId ||
            blocked === road.b + road.a;

        let color = "#22c58b";

        if (traffic === "medium" && road.congestion >= 1) {
            color = "#e8b94d";
        }

        if (traffic === "high" && road.congestion >= 1) {
            color = "#ed3b4b";
        }

        if (isBlocked) {
            color = "#ed3b4b";
        }

        ctx.beginPath();

        ctx.moveTo(
            px(nodes[road.a].x),
            py(nodes[road.a].y)
        );

        ctx.lineTo(
            px(nodes[road.b].x),
            py(nodes[road.b].y)
        );

        ctx.strokeStyle = color;
        ctx.lineWidth = isBlocked ? 3 : 5;
        ctx.lineCap = "round";

        if (isBlocked) {
            ctx.setLineDash([8, 7]);
        }

        ctx.stroke();
        ctx.setLineDash([]);

    });

    // Highlight selected route

    if (selectedRoute && selectedRoute.path) {

        ctx.beginPath();

        selectedRoute.path.forEach((id, index) => {

            const point = nodes[id];

            if (index === 0) {
                ctx.moveTo(px(point.x), py(point.y));
            } else {
                ctx.lineTo(px(point.x), py(point.y));
            }

        });

        ctx.strokeStyle = "#438cf5";
        ctx.lineWidth = 9;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        ctx.strokeStyle = "#a5caff";
        ctx.lineWidth = 2;
        ctx.stroke();

    }

    // Draw nodes and labels

    Object.keys(nodes).forEach(id => {

        const point = nodes[id];

        const isHospital = ["E", "F", "H"].includes(id);

        ctx.beginPath();

        ctx.arc(
            px(point.x),
            py(point.y),
            12,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = isHospital ? "#ed3b4b" : "#263e5e";
        ctx.fill();

        ctx.strokeStyle = "#dceaff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(id, px(point.x), py(point.y));

        ctx.fillStyle = "#d0dced";
        ctx.font = "11px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            point.name,
            px(point.x),
            py(point.y) + 26
        );

    });

    // Draw animated ambulance

    if (
        selectedRoute &&
        selectedRoute.path.length > 1 &&
        animationStep > 0
    ) {

        const previous = nodes[
            selectedRoute.path[
                Math.floor(animationStep)
            ]
        ];

        if (previous) {

            ctx.beginPath();
            ctx.arc(
                px(previous.x),
                py(previous.y),
                15,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = "#ed3b4b";
            ctx.fill();

            ctx.font = "17px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🚑", px(previous.x), py(previous.y));

        }
    }

}


// 10. AMBULANCE SIMULATION

function startAnimation() {

    if (!selectedRoute) return;

    stopAnimation();

    animationStep = 0;

    const routeLength = selectedRoute.path.length;

    document.getElementById("simulate-btn").textContent =
        "▶ Restart Ambulance";

    animationTimer = setInterval(() => {

        animationStep += 0.025;

        if (animationStep >= routeLength - 1) {

            animationStep = routeLength - 1;

            stopAnimation();

            document.getElementById("simulate-btn").textContent =
                "✓ Simulation Complete";

        }

        drawMap();

    }, 100);

}

function pauseAnimation() {

    stopAnimation();

    document.getElementById("simulate-btn").textContent =
        "▶ Resume Ambulance";
}

function stopAnimation() {

    if (animationTimer) {
        clearInterval(animationTimer);
        animationTimer = null;
    }

}


// 11. RESET SYSTEM

function resetSystem() {

    stopAnimation();

    animationStep = 0;
    selectedRoute = null;
    lastComparison = null;

    document.getElementById("start").value = "A";
    document.getElementById("end").value = "E";
    document.getElementById("algorithm").value = "astar";
    document.getElementById("traffic").value = "medium";
    document.getElementById("blocked-road").value = "none";

    document.getElementById("route-output").innerHTML =
        "<p class='empty-message'>Configure your route and click Calculate Optimal Route.</p>";

    document.getElementById("metric-distance").textContent = "-- km";
    document.getElementById("metric-time").textContent = "-- min";
    document.getElementById("metric-nodes").textContent = "--";
    document.getElementById("metric-execution").textContent = "-- ms";
    document.getElementById("metric-traffic").textContent = "--";

    document.getElementById("simulate-btn").disabled = true;
    document.getElementById("pause-btn").disabled = true;
    document.getElementById("simulate-btn").textContent = "▶ Start Ambulance";

    const comparisonIds = [
        "astar-route", "greedy-route",
        "astar-distance", "greedy-distance",
        "astar-time", "greedy-time",
        "astar-nodes", "greedy-nodes",
        "astar-execution", "greedy-execution"
    ];

    comparisonIds.forEach(id => {
        document.getElementById(id).textContent = "--";
    });

    drawMap();
}


// 12. CONNECT BUTTONS AND EVENTS

document.getElementById("calculate-btn")
    .addEventListener("click", calculateRoute);

document.getElementById("compare-btn")
    .addEventListener("click", compareAlgorithms);

document.getElementById("reset-btn")
    .addEventListener("click", resetSystem);

document.getElementById("simulate-btn")
    .addEventListener("click", startAnimation);

document.getElementById("pause-btn")
    .addEventListener("click", pauseAnimation);

document.getElementById("traffic")
    .addEventListener("change", () => {
        stopAnimation();
        selectedRoute = null;
        drawMap();
    });

document.getElementById("blocked-road")
    .addEventListener("change", () => {
        stopAnimation();
        selectedRoute = null;
        drawMap();
    });

window.addEventListener("resize", drawMap);


// 13. INITIALIZE WEBSITE

drawMap();

console.log("MEDIROUTE system initialized successfully.");
console.log("A* and Greedy Best-First Search are ready.");
