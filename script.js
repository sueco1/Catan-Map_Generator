document.addEventListener("DOMContentLoaded", () => {
  const boardDiv = document.getElementById("board");
  const genBtn = document.getElementById("gen-btn");
  const redRuleToggle = document.getElementById("red-rule-toggle");
  const fixedPortsToggle = document.getElementById("fixed-ports-toggle");

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

  // Port Angles (mapped to Water Tile Indices)
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
    const useRedRule = redRuleToggle ? redRuleToggle.checked : true;
    const useFixedPorts = fixedPortsToggle ? fixedPortsToggle.checked : false;

    let validMapFound = false;
    let attemptCount = 0;
    let finalTiles = [];

    // Retry Loop
    while (!validMapFound && attemptCount < 1000) {
      attemptCount++;
      let currentTerrains = [...terrains];
      shuffle(currentTerrains);
      
      let tempTiles = [];
      for(let i=0; i<19; i++){
        tempTiles.push({ id: i, terrain: currentTerrains[i], number: null });
      }

      let currentNumbers = [...numbers];
      shuffle(currentNumbers);

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
      alert("Could not find a valid map layout. Try again!");
      return;
    }

    // --- RENDERING ---
    boardDiv.innerHTML = "";
    updateStats(finalTiles);

    // 1. SETUP PORTS
    // We define currentPorts. .pop() removes from the END.
    // The render loop below iterates 0..17.
    // It triggers pop() on indices: 0, 2, 5, 6, 9, 10, 13, 14, 16.
    
    let currentPorts = [];

    if (useFixedPorts) {
      // STANDARD CATAN ORDER: Generic -> Sheep -> Generic -> Ore -> Generic -> Wheat -> Brick -> Generic -> Wood
      // Since pop() takes the LAST item, we must arrange the array in REVERSE of the trigger order.
      // Trigger Order: 0(Gen), 2(Shp), 5(Gen), 6(Ore), 9(Gen), 10(Wht), 13(Brk), 14(Gen), 16(Wood)
      
      currentPorts = [
        "wood",     // For index 16
        "generic",  // For index 14
        "brick",    // For index 13
        "wheat",    // For index 10
        "generic",  // For index 9
        "ore",      // For index 6
        "generic",  // For index 5
        "sheep",    // For index 2
        "generic"   // For index 0
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
        const portType = currentPorts.pop(); // Logic works here for both Fixed and Random
        const rotation = portPositions[i];
        
        const portDiv = document.createElement("div");
        portDiv.classList.add("port");
        portDiv.style.transform = `rotate(${rotation}deg)`;
        
        const iconDiv = document.createElement("div");
        iconDiv.classList.add("port-icon", portType);
        
        const textSpan = document.createElement("span");
        // No text needed in CSS for icons, but good for accessibility/debug logic
        
        // Add text symbol if needed, though color usually implies it
        // If you want "3:1" or "2:1" text:
        // textSpan.classList.add("port-text");
        // textSpan.style.transform = `rotate(${-rotation}deg)`;
        // textSpan.textContent = portType === "generic" ? "3:1" : "2:1";
        // iconDiv.appendChild(textSpan);
        
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
