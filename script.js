document.addEventListener("DOMContentLoaded", () => {
  const boardDiv = document.getElementById("board");
  const genBtn = document.getElementById("gen-btn");
  
  // Toggles
  const toggle68 = document.getElementById("prevent-6-8");
  const toggle212 = document.getElementById("prevent-2-12");
  const toggleFixedPorts = document.getElementById("fixed-ports-toggle");
  const toggleNoClump = document.getElementById("no-clump-toggle");

  // --- THEME TOGGLER ---
  const sunIcon = document.getElementById("sun-icon");
  const moonIcon = document.getElementById("moon-icon");
  const bodyEl = document.body;

  function setMode(mode) {
    if (mode === 'dark') {
      bodyEl.classList.add("dark-mode");
      moonIcon.classList.add("active");
      sunIcon.classList.remove("active");
    } else {
      bodyEl.classList.remove("dark-mode");
      sunIcon.classList.add("active");
      moonIcon.classList.remove("active");
    }
  }

  sunIcon.addEventListener("click", () => setMode('light'));
  moonIcon.addEventListener("click", () => setMode('dark'));

  // --- DATA ---

  const terrainsSource = [
    "desert",
    "ore", "ore", "ore",
    "brick", "brick", "brick",
    "sheep", "sheep", "sheep", "sheep",
    "wood", "wood", "wood", "wood",
    "wheat", "wheat", "wheat", "wheat"
  ];

  // Note: 18 numbers (Desert gets skipped)
  const numbersSource = [
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

  const tileCoordinates = [
    { id: 0,  top: 150, left: 250 }, { id: 1,  top: 150, left: 350 }, { id: 2,  top: 150, left: 450 },
    { id: 3,  top: 236, left: 200 }, { id: 4,  top: 236, left: 300 }, { id: 5,  top: 236, left: 400 }, { id: 6,  top: 236, left: 500 },
    { id: 7,  top: 322, left: 150 }, { id: 8,  top: 322, left: 250 }, { id: 9,  top: 322, left: 350 }, { id: 10, top: 322, left: 450 }, { id: 11, top: 322, left: 550 },
    { id: 12, top: 408, left: 200 }, { id: 13, top: 408, left: 300 }, { id: 14, top: 408, left: 400 }, { id: 15, top: 408, left: 500 },
    { id: 16, top: 494, left: 250 }, { id: 17, top: 494, left: 350 }, { id: 18, top: 494, left: 450 }
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

  const adjacency = [
    [1, 3, 4],          // 0
    [0, 2, 4, 5],       // 1
    [1, 5, 6],          // 2
    [0, 4, 7, 8],       // 3
    [0, 1, 3, 5, 8, 9], // 4
    [1, 2, 4, 6, 9, 10],// 5
    [2, 5, 10, 11],     // 6
    [3, 8, 12],         // 7
    [3, 4, 7, 9, 12, 13], // 8
    [4, 5, 8, 10, 13, 14], // 9
    [5, 6, 9, 11, 14, 15], // 10
    [6, 10, 15],        // 11
    [7, 8, 13, 16],     // 12
    [8, 9, 12, 14, 16, 17], // 13
    [9, 10, 13, 15, 17, 18], // 14
    [10, 11, 14, 18],   // 15
    [12, 13, 17],       // 16
    [13, 14, 16, 18],   // 17
    [14, 15, 17]        // 18
  ];

  // --- HELPERS ---

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Helper: Check if map has resource clumps (3+ of same type connected)
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
      if (groupSize > 2) return true; // Fail if clump > 2
    }
    return false;
  }

  // Helper: Update Stats Panel
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

  // Helper: Render Intersection Pips
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
        const absX = coords.left + offset.x;
        const absY = coords.top + offset.y;
        // Snap to grid (nearest 5)
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

  // --- VALIDATION LOGIC ---
  
  function isValidMap(tiles, check68, check212) {
    for (let i = 0; i < 19; i++) {
      const current = tiles[i];
      if (current.number === null) continue; // Skip desert

      const neighbors = adjacency[i];
      for (let nId of neighbors) {
        const neighbor = tiles[nId];
        if (neighbor.number === null) continue;

        // Rule 1: No 6s or 8s touching
        if (check68) {
           if ( (current.number === 6 || current.number === 8) && 
                (neighbor.number === 6 || neighbor.number === 8) ) {
             return false;
           }
        }

        // Rule 2: No 2s or 12s touching
        if (check212) {
           if ( (current.number === 2 || current.number === 12) && 
                (neighbor.number === 2 || neighbor.number === 12) ) {
             return false;
           }
        }
      }
    }
    return true;
  }

  // --- MAIN GENERATOR ---

  genBtn.addEventListener("click", () => {
    // 1. Get Toggle States
    const use68Rule = toggle68 ? toggle68.checked : true;
    const use212Rule = toggle212 ? toggle212.checked : true;
    const useNoClump = toggleNoClump ? toggleNoClump.checked : false;
    const useFixedPorts = toggleFixedPorts ? toggleFixedPorts.checked : false;

    let success = false;
    let attempts = 0;
    let finalTiles = [];

    // 2. Loop until valid map found or timeout
    while (!success && attempts < 2000) {
      attempts++;
      
      // A. Generate Terrains
      let currentTerrains = [...terrainsSource];
      shuffle(currentTerrains);
      
      // Create Tile Objects
      let tempTiles = [];
      for(let i=0; i<19; i++) {
        tempTiles.push({ id: i, terrain: currentTerrains[i], number: null });
      }

      // Check Clumping (if enabled) - Retry terrain shuffle if bad
      if (useNoClump && checkClumping(tempTiles)) continue;

      // B. Assign Numbers
      let currentNumbers = [...numbersSource];
      shuffle(currentNumbers);
      
      // Fill non-desert tiles
      for(let t of tempTiles) {
        if(t.terrain !== "desert") {
          t.number = currentNumbers.pop();
        }
      }

      // C. Validate Number Placement
      if (isValidMap(tempTiles, use68Rule, use212Rule)) {
        success = true;
        finalTiles = tempTiles;
      }
    }

    if (!success) {
      alert("Could not generate a valid map with these strict settings. Please try again.");
      return;
    }

    // --- RENDER BOARD ---
    boardDiv.innerHTML = "";
    updateStats(finalTiles);

    // 1. Ports
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

      if (portPositions.hasOwnProperty(i)) {
        const portType = currentPorts.pop();
        const rotation = portPositions[i];
        
        const portDiv = document.createElement("div");
        portDiv.classList.add("port");
        portDiv.style.transform = `rotate(${rotation}deg)`;
        
        // Harbormaster Highlighting
        portDiv.addEventListener("mouseenter", () => {
          boardDiv.classList.add("board-dimmed");
          portDiv.classList.add("active-port");
          const allLandHexes = document.querySelectorAll(".hex:not(.ocean)");
          
          allLandHexes.forEach(hex => {
            let match = false;
            // Get number from token inside hex
            const numSpan = hex.querySelector(".token-number");
            
            if (portType === "generic") {
               // Highlight 6 and 8
               if (numSpan && (numSpan.textContent === "6" || numSpan.textContent === "8")) match = true;
            } else {
               // Highlight Matching Resource
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

  // --- PLAYER RANDOMIZER (SIMPLE BUTTON VERSION) ---
  
  window.generateTurnOrder = function(count) {
    const list = document.getElementById("turn-order-list");
    if (!list) return;
    
    list.innerHTML = ""; // Clear list

    // Pool of available colors
    const colors = ["Red", "Blue", "Orange", "White", "Green", "Brown"];
    shuffle(colors);

    // Slice array for number of players
    const selectedPlayers = colors.slice(0, count);

    // Render list
    selectedPlayers.forEach((color, index) => {
      const li = document.createElement("li");
      li.classList.add("order-item");
      
      const numSpan = document.createElement("span");
      numSpan.textContent = `${index + 1}.`;
      numSpan.style.marginRight = "10px";
      numSpan.style.color = "#666";

      const nameSpan = document.createElement("span");
      nameSpan.textContent = color;
      nameSpan.classList.add(`p-${color}`);

      li.appendChild(numSpan);
      li.appendChild(nameSpan);
      list.appendChild(li);
    });
  };

});
