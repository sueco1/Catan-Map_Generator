 /* ==========================================================================

1. GAME CONFIGURATION & DATA

========================================================================== */


const terrainsSource = [

"wood", "wood", "wood", "wood",

"brick", "brick", "brick",

"sheep", "sheep", "sheep", "sheep",

"wheat", "wheat", "wheat", "wheat",

"ore", "ore", "ore",

"desert"

];


const numbersSource = [

2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12

];


const pipMap = {

2: 1, 12: 1,

3: 2, 11: 2,

4: 3, 10: 3,

5: 4, 9: 4,

6: 5, 8: 5

};


const portTypesSource = [

"wood", "brick", "sheep", "wheat", "ore",

"generic", "generic", "generic", "generic"

];


const portPositions = {

0: 330, 2: 30, 5: 30, 6: 270, 9: 90,

10: 270, 13: 150, 14: 210, 16: 150

};


/* ==========================================================================

2. DOM ELEMENT REFERENCES

========================================================================== */

const boardDiv = document.getElementById("board");

const genBtn = document.getElementById("gen-btn");


const toggle68 = document.getElementById("prevent-6-8");

const toggle212 = document.getElementById("prevent-2-12");

const toggleNoClump = document.getElementById("no-clump-toggle");

const toggleFixedPorts = document.getElementById("fixed-ports-toggle");


const statBars = {

wood: document.getElementById("bar-wood"),

brick: document.getElementById("bar-brick"),

sheep: document.getElementById("bar-sheep"),

wheat: document.getElementById("bar-wheat"),

ore: document.getElementById("bar-ore")

};

const statVals = {

wood: document.getElementById("val-wood"),

brick: document.getElementById("val-brick"),

sheep: document.getElementById("val-sheep"),

wheat: document.getElementById("val-wheat"),

ore: document.getElementById("val-ore")

};


const themeToggle = document.querySelector(".theme-toggle");

const sunIcon = document.getElementById("sun-icon");

const moonIcon = document.getElementById("moon-icon");


let selectedPlayers = [];


/* ==========================================================================

3. INJECT CUSTOM ANIMATION STYLES (FIX FOR OFFSET)

========================================================================== */

// We inject a specific keyframe that keeps the dot centered (-50%, -50%)

// while it scales up. This prevents the "jumping" offset issue.

const styleSheet = document.createElement("style");

styleSheet.textContent = `

@keyframes popInCentered {

0% { transform: translate(-50%, -50%) scale(0); }

80% { transform: translate(-50%, -50%) scale(1.2); }

100% { transform: translate(-50%, -50%) scale(1); }

}

.animate-intersection {

animation: popInCentered 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;

opacity: 0; /* Start invisible until animation kicks in */

animation-fill-mode: forwards;

}

`;

document.head.appendChild(styleSheet);


/* ==========================================================================

4. HELPER FUNCTIONS

========================================================================== */


function shuffle(array) {

for (let i = array.length - 1; i > 0; i--) {

const j = Math.floor(Math.random() * (i + 1));

[array[i], array[j]] = [array[j], array[i]];

}

}


function check68Touching(tiles) {

const adj = getAdjacencyMap();

for (let i = 0; i < 19; i++) {

const t1 = tiles[i];

if (t1.number === 6 || t1.number === 8) {

const neighbors = adj[i];

for (let nIndex of neighbors) {

const t2 = tiles[nIndex];

if (t2.number === 6 || t2.number === 8) return true;

}

}

}

return false;

}


function check212Touching(tiles) {

const adj = getAdjacencyMap();

for (let i = 0; i < 19; i++) {

const t1 = tiles[i];

if (t1.number === 2 || t1.number === 12) {

const neighbors = adj[i];

for (let nIndex of neighbors) {

const t2 = tiles[nIndex];

if (t2.number === 2 || t2.number === 12) return true;

}

}

}

return false;

}


function checkClumping(tiles) {

const adj = getAdjacencyMap();

for(let i=0; i<19; i++) {

const t1 = tiles[i];

if(t1.terrain === "desert") continue;

const neighbors = adj[i];

for(let nIndex of neighbors) {

const t2 = tiles[nIndex];

if(t1.terrain === t2.terrain) return true;

}

}

return false;

}


function isValidMap(tiles, use68, use212) {

if (use68 && check68Touching(tiles)) return false;

if (use212 && check212Touching(tiles)) return false;

return true;

}


function getAdjacencyMap() {

return {

0: [1, 3, 4], 1: [0, 2, 4, 5], 2: [1, 5, 6],

3: [0, 4, 7, 8], 4: [0, 1, 3, 5, 8, 9], 5: [1, 2, 4, 6, 9, 10], 6: [2, 5, 10, 11],

7: [3, 8, 12], 8: [3, 4, 7, 9, 12, 13], 9: [4, 5, 8, 10, 13, 14], 10:[5, 6, 9, 11, 14, 15], 11:[6, 10, 15],

12:[7, 8, 13, 16], 13:[8, 9, 12, 14, 16, 17], 14:[9, 10, 13, 15, 17, 18], 15:[10, 11, 14, 18],

16:[12, 13, 17], 17:[13, 14, 16, 18], 18:[14, 15, 17]

};

}


function updateStats(tiles) {

const counts = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };

tiles.forEach(t => {

if (t.terrain !== "desert" && t.terrain !== "ocean") {

const pips = pipMap[t.number];

if (counts.hasOwnProperty(t.terrain)) counts[t.terrain] += pips;

}

});

const maxVal = Math.max(...Object.values(counts), 1);

for (let key in counts) {

if(statVals[key]) {

statVals[key].textContent = counts[key];

const pct = (counts[key] / maxVal) * 100;

statBars[key].style.width = `${pct}%`;

}

}

}


/* ==========================================================================

5. MAIN GENERATOR LOGIC

========================================================================== */


genBtn.addEventListener("click", () => {

const use68Rule = toggle68 ? toggle68.checked : true;

const use212Rule = toggle212 ? toggle212.checked : true;

const useNoClump = toggleNoClump ? toggleNoClump.checked : false;

const useFixedPorts = toggleFixedPorts ? toggleFixedPorts.checked : false;


let success = false;

let attempts = 0;

let finalTiles = [];


while (!success && attempts < 150000) {

attempts++;

let currentTerrains = [...terrainsSource];

shuffle(currentTerrains);

let tempTiles = [];

for(let i=0; i<19; i++) {

tempTiles.push({ id: i, terrain: currentTerrains[i], number: null });

}


if (useNoClump && checkClumping(tempTiles)) continue;


let currentNumbers = [...numbersSource];

shuffle(currentNumbers);

for(let t of tempTiles) {

if(t.terrain !== "desert") t.number = currentNumbers.pop();

}


if (isValidMap(tempTiles, use68Rule, use212Rule)) {

success = true;

finalTiles = tempTiles;

}

}


if (!success) {

alert("Could not generate a valid map with these settings.");

return;

}


// --- RENDER BOARD ---

boardDiv.innerHTML = "";

updateStats(finalTiles);


let delayIndex = 0;

const isMobile = window.matchMedia("(hover: none)").matches;


let currentPorts = [];

if (useFixedPorts) {

currentPorts = ["ore", "generic", "wheat", "sheep", "generic", "generic", "wood", "brick", "generic"];

} else {

currentPorts = [...portTypesSource];

shuffle(currentPorts);

}


// Render Water & Ports

for (let i = 0; i < 18; i++) {

const currentDelay = `${delayIndex * 0.05}s`;


const div = document.createElement("div");

div.classList.add("hex", "ocean", `water-${i}`);

div.classList.add("animate-deal");

div.style.animationDelay = currentDelay;

div.addEventListener('animationend', () => {

div.classList.remove('animate-deal');

div.classList.add('animation-finished');

}, { once: true });

boardDiv.appendChild(div);


if (portPositions.hasOwnProperty(i)) {

const portType = currentPorts.pop();

const rotation = portPositions[i];

const portWrapper = document.createElement("div");

portWrapper.classList.add("hex", `water-${i}`, "port-wrapper");

portWrapper.style.background = "transparent";

portWrapper.style.clipPath = "none";

portWrapper.style.zIndex = "500";

portWrapper.style.pointerEvents = "none";


portWrapper.classList.add("animate-deal");

portWrapper.style.animationDelay = currentDelay;

portWrapper.addEventListener('animationend', () => {

portWrapper.classList.remove('animate-deal');

portWrapper.classList.add('animation-finished');

}, { once: true });

const portDiv = document.createElement("div");

portDiv.classList.add("port");

portDiv.style.transform = `rotate(${rotation}deg)`;

portDiv.style.setProperty('--rotation', `${rotation}deg`);

portDiv.style.pointerEvents = "auto";


if (!isMobile) {

portDiv.addEventListener("mouseenter", () => {

boardDiv.classList.add("board-dimmed");

portDiv.classList.add("active-port");

const allLandHexes = document.querySelectorAll(".hex:not(.ocean):not(.port-wrapper)");

allLandHexes.forEach(hex => {

let match = false;

if (portType === "generic") {

const numSpan = hex.querySelector(".token-number");

if (numSpan) {

const val = numSpan.textContent;

if (val === "6" || val === "8") match = true;

}

} else {

if (hex.classList.contains(portType)) match = true;

}

if (match) hex.classList.add("highlight-target");

});

});

portDiv.addEventListener("mouseleave", () => {

boardDiv.classList.remove("board-dimmed");

portDiv.classList.remove("active-port");

document.querySelectorAll(".highlight-target").forEach(el => el.classList.remove("highlight-target"));

});

}


const iconDiv = document.createElement("div");

iconDiv.classList.add("port-icon", portType);

const textSpan = document.createElement("span");

textSpan.classList.add("port-text");

textSpan.style.transform = `rotate(${-rotation}deg)`;

textSpan.textContent = portType === "generic" ? "3:1" : "2:1";

iconDiv.appendChild(textSpan);

portDiv.appendChild(iconDiv);

portWrapper.appendChild(portDiv);

boardDiv.appendChild(portWrapper);

}

delayIndex++;

}


// Render Land Tiles

finalTiles.forEach(tile => {

const div = document.createElement("div");

div.classList.add("hex", tile.terrain, `tile-${tile.id}`);


div.classList.add("animate-deal");

div.style.animationDelay = `${delayIndex * 0.05}s`;

div.addEventListener('animationend', () => {

div.classList.remove('animate-deal');

div.classList.add('animation-finished');

}, { once: true });

delayIndex++;


if (tile.number !== null) {

const token = document.createElement("div");

token.classList.add("token");

if (tile.number === 6 || tile.number === 8) token.classList.add("red");

if (tile.number === 5 || tile.number === 9) token.classList.add("orange");


const numSpan = document.createElement("span");

numSpan.classList.add("token-number");

numSpan.textContent = tile.number;

const pipsSpan = document.createElement("span");

pipsSpan.classList.add("token-pips");

pipsSpan.textContent = "•".repeat(pipMap[tile.number]);

token.appendChild(numSpan);

token.appendChild(pipsSpan);

div.appendChild(token);

}

boardDiv.appendChild(div);

});


// Render Intersections (Ripple continues)

renderIntersections(finalTiles, delayIndex);

});


/* ==========================================================================

6. INTERSECTION RENDERER (UPDATED)

========================================================================== */


function renderIntersections(tiles, startDelay) {

const intersectionMap = {};

tiles.forEach(tile => {

if (tile.terrain === 'desert') return;

const tilePips = tile.number ? pipMap[tile.number] : 0;

const el = document.querySelector(`.tile-${tile.id}`);

if (!el) return;

const style = getComputedStyle(el);

// Use parseFloat for better precision to avoid rounding errors

const top = parseFloat(style.top);

const left = parseFloat(style.left);

const cx = left + 50;

const corners = [

{ x: cx, y: top },

{ x: left + 100, y: top + 29 },

{ x: left + 100, y: top + 86 },

{ x: cx, y: top + 115 },

{ x: left, y: top + 86 },

{ x: left, y: top + 29 }

];


corners.forEach(c => {

const sx = Math.round(c.x / 5) * 5;

const sy = Math.round(c.y / 5) * 5;

const key = `${sx},${sy}`;

if (!intersectionMap[key]) {

intersectionMap[key] = { x: sx, y: sy, pips: 0 };

}

intersectionMap[key].pips += tilePips;

});

});


let dotDelay = startDelay;


Object.values(intersectionMap).forEach(pt => {

const dot = document.createElement('div');

dot.classList.add('intersection');

dot.style.left = `${pt.x}px`;

dot.style.top = `${pt.y}px`;

dot.dataset.pips = pt.pips;

dot.textContent = pt.pips;


if (pt.pips >= 10) {

dot.classList.add('high-pips');

}


// USE NEW CLASS 'animate-intersection' which handles centering

dot.classList.add('animate-intersection');

dot.style.animationDelay = `${dotDelay * 0.03}s`;

// Ensure the opacity stays at 1 after animation ends

dot.addEventListener('animationend', () => {

dot.style.opacity = '1';

}, { once: true });


boardDiv.appendChild(dot);

dotDelay++;

});

}


/* ==========================================================================

7. PLAYER TURN ORDER & UI

========================================================================== */

// (Same as before)


function togglePlayer(el, color) {

if (selectedPlayers.includes(color)) {

selectedPlayers = selectedPlayers.filter(c => c !== color);

el.classList.remove("selected");

} else {

selectedPlayers.push(color);

el.classList.add("selected");

}

}


function rollTurnOrder() {

const list = document.getElementById("turn-order-list");

list.innerHTML = "";

if (selectedPlayers.length === 0) {

list.innerHTML = '<li style="color:#666; font-style:italic;">Select at least 1 player.</li>';

return;

}

let results = selectedPlayers.map(p => {

return { color: p, roll: Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1 };

});

results.sort((a, b) => b.roll - a.roll);

const rankNames = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"];

results.forEach((item, index) => {

const li = document.createElement("li");

li.classList.add("order-item");

const spanName = document.createElement("span");

spanName.textContent = item.color;

spanName.classList.add(`p-${item.color}`);

const spanRank = document.createElement("span");

spanRank.textContent = rankNames[index];

spanRank.style.color = "#888";

spanRank.style.fontSize = "0.9em";

li.appendChild(spanName);

li.appendChild(spanRank);

list.appendChild(li);

});

}


if (themeToggle) {

themeToggle.addEventListener("click", () => {

document.body.classList.toggle("dark-mode");

if (document.body.classList.contains("dark-mode")) {

if(sunIcon) sunIcon.classList.remove("active");

if(moonIcon) moonIcon.classList.add("active");

} else {

if(sunIcon) sunIcon.classList.add("active");

if(moonIcon) moonIcon.classList.remove("active");

}

});

} 
