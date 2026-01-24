/* ==========================================================================
   1. GAME CONFIGURATION & DATA
   ========================================================================== */

// --- Terrain & Port Data ---
// 4 Wood, 3 Brick, 4 Sheep, 4 Wheat, 3 Ore, 1 Desert
const terrainsSource = [
  "wood", "wood", "wood", "wood",
  "brick", "brick", "brick",
  "sheep", "sheep", "sheep", "sheep",
  "wheat", "wheat", "wheat", "wheat",
  "ore", "ore", "ore",
  "desert"
];

// --- Number Tokens ---
// 2, 12 appear once. Others appear twice.
const numbersSource = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12
];

// --- Pip Counts (Probability) ---
const pipMap = {
  2: 1, 12: 1,
  3: 2, 11: 2,
  4: 3, 10: 3,
  5: 4, 9: 4,
  6: 5, 8: 5
};

// --- Port Configuration ---
const portTypesSource = [
  "wood", "brick", "sheep", "wheat", "ore",
  "generic", "generic", "generic", "generic"
];

const portPositions = {
  0: 330,  1: 210, 
  3: 30,           
  6: 150,          
  11: 90,          
  15: 330, 16: 270,
  17: 210, 
  12: 30
};

/* ==========================================================================
   2. DOM ELEMENT REFERENCES
   ========================================================================== */
const boardDiv = document.getElementById("board");
const genBtn = document.getElementById("gen-btn");

// Toggles
const toggle68 = document.getElementById("prevent-6-8");
const toggle212 = document.getElementById("prevent-2-12");
const toggleNoClump = document.getElementById("no-clump-toggle");
const toggleFixedPorts = document.getElementById("fixed-ports-toggle");

// Stats
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

// Theme
const themeToggle = document.querySelector(".theme-toggle");
const sunIcon = document.getElementById("sun-icon");
const moonIcon = document.getElementById("moon-icon");

// Player State
let selectedPlayers = [];

/* ==========================================================================
   3. HELPER FUNCTIONS
   ========================================================================== */

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Counts pips for adjacent hexes
function getPipsForHex(tile) {
  if (!tile || tile.number === null) return 0;
  return pipMap[tile.number] || 0;
}

// Logic: Check if 6 and 8 are touching
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

// Logic: Check if 2 and 12 are touching
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

// Logic: Check for clumping (same terrain touching)
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
    0: [1, 3, 4],
    1: [0, 2, 4, 5],
    2: [1, 5, 6],
    3: [0, 4, 7, 8],
    4: [0, 1, 3, 5, 8, 9],
    5: [1, 2, 4, 6, 9, 10],
    6: [2, 5, 10, 11],
    7: [3, 8, 12],
    8: [3, 4, 7, 9, 12, 13],
    9: [4, 5, 8, 10, 13, 14],
    10:[5, 6, 9, 11, 14, 15],
    11:[6, 10, 15],
    12:[7, 8, 13, 16],
    13:[8, 9, 12, 14, 16, 17],
    14:[9, 10, 13, 15, 17, 18],
    15:[10, 11, 14, 18],
    16:[12, 13, 17],
    17:[13, 14, 16, 18],
    18:[14, 15, 17]
  };
}

/* ==========================================================================
   4. STATS & UI UPDATES
   ========================================================================== */

function updateStats(tiles) {
  const counts = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
  
  tiles.forEach(t => {
    if (t.terrain !== "desert" && t.terrain !== "ocean") {
      const pips = pipMap[t.number];
      if (counts.hasOwnProperty(t.terrain)) {
        counts[t.terrain] += pips;
      }
    }
  });

  const maxVal = Math.max(...Object.values(counts), 1);

  for (let key in counts) {
    statVals[key].textContent = counts[key];
    const pct = (counts[key] / maxVal) * 100;
    statBars[key].style.width = `${pct}%`;
  }
}

/* ==========================================================================
   5. MAIN GENERATOR LOGIC (THE "ENGINE")
   ========================================================================== */

genBtn.addEventListener("click", () => {
  // 1. Get Toggle States
  const use68Rule = toggle68 ? toggle68.checked : true;
  const use212Rule = toggle212 ? toggle212.checked : true;
  const useNoClump = toggleNoClump ? toggleNoClump.checked : false;
  const useFixedPorts = toggleFixedPorts ? toggleFixedPorts.checked : false;

  let success = false;
  let attempts = 0;
  let finalTiles = [];

  // 2. Loop until valid map found
  while (!success && attempts < 2000) {
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
      if(t.terrain !== "desert") {
        t.number = currentNumbers.pop();
      }
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

  // 1. Ports & Water
  let currentPorts = [];
  if (useFixedPorts) {
    currentPorts = ["wood", "generic", "brick", "wheat", "generic", "ore", "generic", "sheep", "generic"];
  } else {
    currentPorts = [...portTypesSource];
    shuffle(currentPorts);
  }

  for (let i = 0; i < 18; i++) {
    const div = document.createElement("div");
    div.classList.add("hex", "ocean", `water-${i}`);

    // Animation
    div.classList.add("animate-deal");
    div.style.animationDelay = `${delayIndex * 0.05}s`;
    
    // PERF: Cleanup
    div.addEventListener('animationend', () => {
      div.classList.remove('animate-deal');
      div.classList.add('animation-finished');
    }, { once: true });
    
    delayIndex++;

    if (portPositions.hasOwnProperty(i)) {
      const portType = currentPorts.pop();
      const rotation = portPositions[i];
      
      const portDiv = document.createElement("div");
      portDiv.classList.add("port");
      portDiv.style.transform = `rotate(${rotation}deg)`;
      portDiv.style.setProperty('--rotation', `${rotation}deg`);
      
      // Hover Logic (Desktop Only)
      if (!isMobile) {
          portDiv.addEventListener("mouseenter", () => {
            boardDiv.classList.add("board-dimmed");
            portDiv.classList.add("active-port");
            const allLandHexes = document.querySelectorAll(".hex:not(.ocean)");
            
            allLandHexes.forEach(hex => {
              let match = false;
              const numSpan = hex.querySelector(".token-number");
              
              if (portType === "generic") {
                 if (numSpan && (numSpan.textContent === "6" || numSpan.textContent === "8")) match = true;
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
      div.appendChild(portDiv);
    }
    boardDiv.appendChild(div);
  }

  // 2. Land Tiles
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

  // 3. Intersections
  renderIntersections(finalTiles);
});

/* ==========================================================================
   6. INTERSECTION RENDERER (SPOTS)
   ========================================================================== */

function renderIntersections(tiles) {
  // Coordinates for the 6 corners of a hex (relative to center)
  // Hex size 100x115. Center to corner is roughly 58px vertically.
  // We'll calculate absolute positions based on hex .top/.left
  
  // NOTE: This is a simplified approach. 
  // We scan every tile, calculate its 6 corners, key them by coordinate string "x,y", 
  // and store the pips.
  
  const intersectionMap = {}; // Key: "x,y", Value: { pips: 0 }
  const THRESHOLD = 10; // pixel tolerance to snap corners together

  tiles.forEach(tile => {
    if (tile.terrain === 'desert') return; // Desert has 0 pips usually? Or do we count it as 0? 
    // Actually, desert has no number, so pips=0.
    
    const tilePips = tile.number ? pipMap[tile.number] : 0;
    
    // Get the element to find its top/left
    const el = document.querySelector(`.tile-${tile.id}`);
    if (!el) return;
    
    // Parse top/left from computed style or the class CSS
    // Using simple offset lookup since we know the grid
    const style = getComputedStyle(el);
    const top = parseInt(style.top);
    const left = parseInt(style.left);
    
    // Hex Center
    const cx = left + 50; 
    const cy = top + 57.5;
    
    // 6 Corners (approximate for flat-topped hex, but this CSS is pointy-topped)
    // CSS Clip path: 50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%
    // Width 100, Height 115.
    const corners = [
      { x: cx, y: top },             // Top Center
      { x: left + 100, y: top + 29 }, // Top Right
      { x: left + 100, y: top + 86 }, // Bottom Right
      { x: cx, y: top + 115 },       // Bottom Center
      { x: left, y: top + 86 },      // Bottom Left
      { x: left, y: top + 29 }       // Top Left
    ];

    corners.forEach(c => {
      // Round to nearest 5 to snap
      const sx = Math.round(c.x / 5) * 5;
      const sy = Math.round(c.y / 5) * 5;
      const key = `${sx},${sy}`;
      
      if (!intersectionMap[key]) {
        intersectionMap[key] = { x: sx, y: sy, pips: 0 };
      }
      intersectionMap[key].pips += tilePips;
    });
  });

  // Render the dots
  Object.values(intersectionMap).forEach(pt => {
    // Only show high pip spots? Or all? Let's show all for debugging or hover.
    // For UI cleanliness, maybe only invisible div that appears on hover.
    
    const dot = document.createElement('div');
    dot.classList.add('intersection');
    dot.style.left = `${pt.x}px`;
    dot.style.top = `${pt.y}px`;
    dot.dataset.pips = pt.pips;
    dot.textContent = pt.pips; // Number inside
    
    // Color coding for high spots
    if(pt.pips >= 10) {
       // dot.style.backgroundColor = "gold"; 
       // (Handled in CSS now)
    }

    boardDiv.appendChild(dot);
  });
}

/* ==========================================================================
   7. PLAYER TURN ORDER
   ========================================================================== */

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

  // Create array of { color, roll }
  let results = selectedPlayers.map(p => {
    return { color: p, roll: Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1 };
  });

  // Sort by roll (descending)
  results.sort((a, b) => b.roll - a.roll);

  // Render
  results.forEach((item, index) => {
    const li = document.createElement("li");
    li.classList.add("order-item");
    
    const spanName = document.createElement("span");
    spanName.textContent = `${index + 1}. ${item.color}`;
    spanName.classList.add(`p-${item.color}`); // Adds color class
    
    const spanRoll = document.createElement("span");
    spanRoll.textContent = `Roll: ${item.roll}`;
    
    li.appendChild(spanName);
    li.appendChild(spanRoll);
    list.appendChild(li);
  });
}

/* ==========================================================================
   8. DARK MODE TOGGLE
   ========================================================================== */

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  
  if (document.body.classList.contains("dark-mode")) {
    sunIcon.classList.remove("active");
    moonIcon.classList.add("active");
  } else {
    sunIcon.classList.add("active");
    moonIcon.classList.remove("active");
  }
});
