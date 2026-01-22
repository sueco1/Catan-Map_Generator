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

  // 4. Port Configuration
  // Positions (Water Tile Index -> Rotation)
  // The ORDER here follows the clockwise spiral from top-left
  const portPositions = {
    0: 330,  // Top Left
    2: 30,   // Top Right
    5: 30,   // Right Top
    9: 90,   // Right Middle
    13: 150, // Right Bottom
    16: 150, // Bottom Right
    14: 210, // Bottom Left
    10: 270, // Left Bottom
    6: 270   // Left Top
  };

  // STANDARD PORT ORDER (Clockwise from Top Left)
  // Based on standard board setup
  const standardPorts = [
    "generic", // 0
    "sheep",   // 2
    "generic", // 5
    "generic", // 9
    "brick",   // 13
    "wood",    // 16
    "generic", // 14
    "wheat",   // 10
    "ore"      // 6
  ];

  // Random Source
  const randomPortsSource = [
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
        if (neighbor.number === 6 || neighbor.number === 8) {
          return true;
        }
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

    // 1. GENERATE TILES (Logic unchanged)
    let validMapFound = false;
    let attemptCount = 0;
    let finalTiles = [];

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

    // 2. SETUP PORTS
    let finalPorts = [];
    
    if (useFixedPorts) {
      // Use standard list. Reverse it because we use .pop() (LIFO)
      // Standard order is 0->2->5..., but .pop() takes the last one first.
      // So we reverse it so the first item (Index 0) is at the end of array.
      finalPorts = [...standardPorts].reverse();
    } else {
      // Shuffle random ports
      finalPorts = [...randomPortsSource];
      shuffle(finalPorts);
    }

    // 3. RENDER PORTS (Specific Iteration Order)
    // We must iterate through the water tiles in the specific order defined in portPositions
    // To ensure "Fixed Ports" appear in the correct clockwise slots.
    
    // The keys of portPositions are [0, 2, 5, 9, 13, 16, 14, 10, 6] (roughly)
    // We need to loop 0..17 for rendering, but check against positions.
    
    // Actually, because portPositions is an Object, order isn't guaranteed in loop.
    // But since we map Index -> Rotation, we just need to make sure we assign 
    // the popped port to the correct index based on our "Clockwise" logic.
    
    // Let's create a specific order array for the water tiles that HAVE ports
    const waterTilesWithPorts = [0, 2, 5, 9, 13, 16, 14, 10, 6];

    // Create a map of Index -> PortType for easy rendering
    const assignedPorts = {};
    waterTilesWithPorts.forEach(waterIndex => {
        assignedPorts[waterIndex] = finalPorts.pop(); // Take from stack
    });

    // RENDER WATER
    for (let i = 0; i < 18; i++) {
      const div = document.createElement("div");
      div.classList.add("hex", "ocean", `water-${i}`);

      if (portPositions.hasOwnProperty(i)) {
        const rotation = portPositions[i];
        const portType = assignedPorts[i]; // Get the assigned type

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

    // 4. RENDER LAND
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
