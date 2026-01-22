document.addEventListener("DOMContentLoaded", () => {
  const boardDiv = document.getElementById("board");
  const genBtn = document.getElementById("gen-btn");
  const redRuleToggle = document.getElementById("red-rule-toggle");
  const fixedPortsToggle = document.getElementById("fixed-ports-toggle");
  const noClumpToggle = document.getElementById("no-clump-toggle"); // <--- NEW TOGGLE

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

  // Check 1: Red Number Rule (No 6s or 8s touching)
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

  // Check 2: Clumping Rule (No Wood touching Wood, etc.)
  function checkClumping(tiles) {
    for (let tile of tiles) {
      if (tile.terrain === "desert") continue; // Desert is safe
      
      const neighbors = adjacency[tile.id];
      for (let neighborId of neighbors) {
        const neighbor = tiles[neighborId];
        // If neighbor is same terrain, we have a clump
        if (neighbor.terrain === tile.terrain) {
          return true; // Failed check
        }
      }
    }
    return false; // No clumps found
  }

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

  // --- MAIN GENERATOR ---

  genBtn.addEventListener("click", () => {
    // Read Toggles
    const useRedRule = redRuleToggle ? redRuleToggle.checked : true;
    const useFixedPorts = fixedPortsToggle ? fixedPortsToggle.checked : false;
    const useNoClumping = noClumpToggle ? noClumpToggle.checked : false;

    let validMapFound = false;
    let attemptCount = 0;
    let finalTiles = [];

    // Retry Loop (Increased limit because clumping + red rule is harder to solve)
    while (!validMapFound && attemptCount < 5000) {
      attemptCount++;
      
      // 1. Setup & Shuffle Terrains
      let currentTerrains = [...terrains];
      shuffle(currentTerrains);
      
      let tempTiles = [];
      for(let i=0; i<19; i++){
        tempTiles.push({ id: i, terrain: currentTerrains[i], number: null });
      }

      // 2. CHECK: Terrain Clumping
      // If user wants no clumping, we check immediately after placing terrains.
      // If it fails, we 'continue' to restart the loop immediately.
      if (useNoClumping) {
        if (checkClumping(tempTiles)) {
          continue; // Try again
        }
      }

      // 3. Setup & Shuffle Numbers
      let currentNumbers = [...numbers];
      shuffle(currentNumbers);

      // 4. Assign Numbers & Check Red Rule
      let mapIsValid = true;
      for (let tile of tempTiles) {
        if (tile.terrain === "desert") continue;
        const num = currentNumbers.pop();
        tile.number = num;

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
      alert(`Could not find a valid map in ${attemptCount} attempts. Try loosening the rules!`);
      return;
    }

    // --- RENDERING ---
    boardDiv.innerHTML = "";
    updateStats(finalTiles);

    // 1. SETUP PORTS
    let currentPorts = [];
    if (useFixedPorts) {
      // Reversed standard order for .pop()
      currentPorts = [
        "wood", "generic", "brick", "wheat", "generic", "ore", "generic", "sheep", "generic"
      ];
    } else {
      currentPorts = [...portTypesSource];
      shuffle(currentPorts);
    }

    // 2. Render Water & Ports
    for (let i = 0; i < 18; i++) {
      const div = document.createElement("div");
      div.classList.add("hex", "ocean", `water-${i}`);

      if (portPositions.hasOwnProperty(i)) {
        const portType = currentPorts.pop();
        const rotation = portPositions[i];
        
        const portDiv = document.createElement("div");
        portDiv.classList.add("port");
        portDiv.style.transform = `rotate(${rotation}deg)`;
        
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

    // 3. Render Land
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
  });
});
