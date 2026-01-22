document.addEventListener("DOMContentLoaded", () => {
  const boardDiv = document.getElementById("board");
  const genBtn = document.getElementById("gen-btn");
  const redRuleToggle = document.getElementById("red-rule-toggle");
  const fixedPortsToggle = document.getElementById("fixed-ports-toggle");
  const noClumpToggle = document.getElementById("no-clump-toggle");

  // --- CONFIGURATION ---

  const terrains = [
    "desert",
    "ore", "ore", "ore",
    "brick", "brick", "brick",
    "sheep", "sheep", "sheep", "sheep",
    "wood", "wood", "wood", "wood",
    "wheat", "wheat", "wheat", "wheat"
  ];

  const numbers = [
    2, 3, 3, 4, 4, 5, 5, 6, 6,
    8, 8, 9, 9, 10, 10, 11, 11, 12
  ];

  const pipMap = {
    2: 1, 12: 1,
    3: 2, 11: 2,
    4: 3, 10: 3,
    5: 4, 9: 4,
    6: 5, 8: 5
  };

  // Coordinates matched to CSS .tile-X (top, left)
  // Used for Intersection Calculation
  const tileCoordinates = [
    { id: 0,  top: 150, left: 250 },
    { id: 1,  top: 150, left: 350 },
    { id: 2,  top: 150, left: 450 },
    { id: 3,  top: 236, left: 200 },
    { id: 4,  top: 236, left: 300 },
    { id: 5,  top: 236, left: 400 },
    { id: 6,  top: 236, left: 500 },
    { id: 7,  top: 322, left: 150 },
    { id: 8,  top: 322, left: 250 },
    { id: 9,  top: 322, left: 350 },
    { id: 10, top: 322, left: 450 },
    { id: 11, top: 322, left: 550 },
    { id: 12, top: 408, left: 200 },
    { id: 13, top: 408, left: 300 },
    { id: 14, top: 408, left: 400 },
    { id: 15, top: 408, left: 500 },
    { id: 16, top: 494, left: 250 },
    { id: 17, top: 494, left: 350 },
    { id: 18, top: 494, left: 450 }
  ];

  const portPositions = {
    0: 330,  2: 30,
    6: 270,  10: 270,
    5: 30,   9: 90,   13: 150,
    14: 210, 16: 150
  };

  const portTypesSource = [
    "wood", "brick", "sheep", "wheat", "ore",
    "generic", "generic", "generic", "generic"
  ];

  const adjacency = {
    0: [1, 3, 4], 1: [0, 2, 4, 5], 2: [1, 5, 6],
    3: [0, 4, 7, 8], 4: [0, 1, 3, 5, 8, 9], 5: [1, 2, 4, 6, 9, 10], 6: [2, 5, 10, 11],
    7: [3, 8, 12], 8: [3, 4, 7, 9, 12, 13], 9: [4, 5, 8, 10, 13, 14], 10: [5, 6, 9, 11, 14, 15], 11: [6, 10, 15],
    12: [7, 8, 13, 16], 13: [8, 9, 12, 14, 16, 17], 14: [9, 10, 13, 15, 17, 18], 15: [10, 11, 14, 18],
    16: [12, 13, 17], 17: [13, 14, 16, 18], 18: [14, 15, 17]
  };

  // --- HELPERS ---

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Rule: No 6s or 8s touching
  function hasBadNeighbor(tileIndex, currentNumber, currentTiles) {
    if (currentNumber !== 6 && currentNumber !== 8) return false;
    const neighbors = adjacency[tileIndex];
    for (let neighborId of neighbors) {
      const neighbor = currentTiles[neighborId];
      if (neighbor && neighbor.number !== null) {
        if (neighbor.number === 6 || neighbor.number === 8) return true;
      }
    }
    return false;
  }

  // Rule: Flood Fill check to prevent groups of 3+ same resources
  function checkClumping(tiles) {
    const visited = new Set();
    for (let i = 0; i < 19; i++) {
      if (visited.has(i)) continue;
      if (tiles[i].terrain === "desert") continue;
      
      let groupSize = 0;
      let queue = [i];
      visited.add(i);
      let resourceType = tiles[i].terrain;

      while (queue.length > 0) {
        let currentId = queue.pop();
        groupSize++;
        let neighbors = adjacency[currentId];
        for (let nId of neighbors) {
          if (!visited.has(nId) && tiles[nId].terrain === resourceType) {
            visited.add(nId);
            queue.push(nId);
          }
        }
      }
      // Allow pairs (2), but fail on 3+
      if (groupSize > 2) return true;
    }
    return false;
  }

  // Update the stats bars below the board
  function updateStats(tiles) {
    const counts = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    tiles.forEach(tile => {
      if (tile.terrain !== "desert" && tile.number !== null) {
        const pips = pipMap[tile.number];
        if (counts.hasOwnProperty(tile.terrain)) {
          counts[tile.terrain] += pips;
        }
      }
    });
    const maxPips = 18; 
    for (const [resource, count] of Object.entries(counts)) {
      const valEl = document.getElementById(`val-${resource}`);
      const barEl = document.getElementById(`bar-${resource}`);
      if (valEl && barEl) {
        valEl.textContent = count;
        const percentage = Math.min((count / maxPips) * 100, 100); 
        barEl.style.width = `${percentage}%`;
      }
    }
  }

  // Feature: Render Intersection Pip Scores
  function renderIntersections(tiles) {
    const offsets = [
      { x: 50, y: 0 }, { x: 100, y: 29 }, { x: 100, y: 86 }, 
      { x: 50, y: 115 }, { x: 0, y: 86 }, { x: 0, y: 29 }
    ];

    const intersectionMap = {};

    tiles.forEach(tile => {
      if (tile.terrain === "desert" || tile.number === null) return;
      const pips = pipMap[tile.number];
      const coords = tileCoordinates[tile.id];

      offsets.forEach(offset => {
        const absX = Math.round(coords.left + offset.x);
        const absY = Math.round(coords.top + offset.y);
        // Snap to grid to handle slight rounding differences
        const snapX = Math.round(absX / 5) * 5;
        const snapY = Math.round(absY / 5) * 5;
        const key = `${snapX},${snapY}`;

        if (!intersectionMap[key]) {
          intersectionMap[key] = { x: snapX, y: snapY, score: 0 };
        }
        intersectionMap[key].score += pips;
      });
    });

    for (const key in intersectionMap) {
      const data = intersectionMap[key];
      if (data.score > 0) {
        const dot = document.createElement("div");
        dot.classList.add("intersection");
        dot.style.left = `${data.x}px`;
        dot.style.top = `${data.y}px`;
        dot.textContent = data.score;
        dot.dataset.pips = data.score;
        boardDiv.appendChild(dot);
      }
    }
  }

  // --- MAIN GENERATOR ---

  genBtn.addEventListener("click", () => {
    // 1. Read Toggles
    const useRedRule = redRuleToggle ? redRuleToggle.checked : true;
    const useFixedPorts = fixedPortsToggle ? fixedPortsToggle.checked : false;
    const useNoClumping = noClumpToggle ? noClumpToggle.checked : false;

    let validMapFound = false;
    let attemptCount = 0;
    let finalTiles = [];

    // 2. Generation Loop (Retry until rules are met)
    while (!validMapFound && attemptCount < 5000) {
      attemptCount++;
      let currentTerrains = [...terrains];
      shuffle(currentTerrains);
      
      let tempTiles = [];
      for(let i=0; i<19; i++){
        tempTiles.push({ id: i, terrain: currentTerrains[i], number: null });
      }

      // Check Clumping
      if (useNoClumping && checkClumping(tempTiles)) continue;

      let currentNumbers = [...numbers];
      shuffle(currentNumbers);

      let mapIsValid = true;
      for (let tile of tempTiles) {
        if (tile.terrain === "desert") continue;
        const num = currentNumbers.pop();
        tile.number = num;

        // Check Red Rule
        if (useRedRule) {
          if (hasBadNeighbor(tile.id, num, tempTiles)) {
            mapIsValid = false;
            break; 
          }
        }
      }

      if (mapIsValid) {
        validMapFound = true;
        finalTiles = tempTiles;
      }
    }

    if (!validMapFound) {
      alert("Could not find a valid map. Try again!");
      return;
    }

    // --- RENDERING ---
    boardDiv.innerHTML = "";
    updateStats(finalTiles);

    // A. Setup Port Array
    let currentPorts = [];
    if (useFixedPorts) {
      currentPorts = [
        "wood", "generic", "brick", "wheat", "generic", "ore", "generic", "sheep", "generic"
      ];
    } else {
      currentPorts = [...portTypesSource];
      shuffle(currentPorts);
    }

    // B. Render Water & Ports (with Harbormaster Logic)
    for (let i = 0; i < 18; i++) {
      const div = document.createElement("div");
      div.classList.add("hex", "ocean", `water-${i}`);

      if (portPositions.hasOwnProperty(i)) {
        const portType = currentPorts.pop();
        const rotation = portPositions[i];
        
        const portDiv = document.createElement("div");
        portDiv.classList.add("port");
        portDiv.style.transform = `rotate(${rotation}deg)`;
        
        // --- HARBORMASTER EVENTS ---
        portDiv.addEventListener("mouseenter", () => {
          boardDiv.classList.add("board-dimmed");
          portDiv.classList.add("active-port");

          const allLandHexes = document.querySelectorAll(".hex:not(.ocean)");
          allLandHexes.forEach(hex => {
            let shouldHighlight = false;
            if (portType === "generic") {
              // Highlight Red Numbers (6 & 8)
              const numSpan = hex.querySelector(".token-number");
              if (numSpan && (numSpan.textContent === "6" || numSpan.textContent === "8")) {
                shouldHighlight = true;
              }
            } else {
              // Highlight Matching Resource
              if (hex.classList.contains(portType)) {
                shouldHighlight = true;
              }
            }

            if (shouldHighlight) hex.classList.add("highlight-target");
          });
        });

        portDiv.addEventListener("mouseleave", () => {
          boardDiv.classList.remove("board-dimmed");
          portDiv.classList.remove("active-port");
          const highlighted = document.querySelectorAll(".highlight-target");
          highlighted.forEach(el => el.classList.remove("highlight-target"));
        });
        // ---------------------------

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

    // C. Render Land Tiles
    finalTiles.forEach(tile => {
      const div = document.createElement("div");
      div.classList.add("hex", tile.terrain, `tile-${tile.id}`);

      if (tile.number !== null) {
        const token = document.createElement("div");
        token.classList.add("token");
        if (tile.number === 6 || tile.number === 8) token.style.color = "#d50000";

        const numSpan = document.createElement("span");
        numSpan.classList.add("token-number");
        numSpan.textContent = tile.number;

        const pipsSpan = document.createElement("span");
        pipsSpan.classList.add("token-pips");
        const count = pipMap[tile.number] || 0;
        pipsSpan.textContent = "•".repeat(count);

        token.appendChild(numSpan);
        token.appendChild(pipsSpan);
        div.appendChild(token);
      }
      boardDiv.appendChild(div);
    });

    // D. Render Intersections
    renderIntersections(finalTiles);
  });
});
