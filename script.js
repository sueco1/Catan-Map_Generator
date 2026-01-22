document.addEventListener("DOMContentLoaded", () => {
  const boardDiv = document.getElementById("board");
  const genBtn = document.getElementById("gen-btn");
  const toggleBtn = document.getElementById("red-rule-toggle");

  // --- CONFIGURATION ---

  // 1. Terrain Distribution (Standard Base Game)
  const terrains = [
    "desert",
    "ore", "ore", "ore",
    "brick", "brick", "brick",
    "sheep", "sheep", "sheep", "sheep",
    "wood", "wood", "wood", "wood",
    "wheat", "wheat", "wheat", "wheat"
  ];

  // 2. Number Distribution (Skip 7)
  // 1x(2), 2x(3-6), 2x(8-11), 1x(12)
  const numbers = [
    2, 3, 3, 4, 4, 5, 5, 6, 6,
    8, 8, 9, 9, 10, 10, 11, 11, 12
  ];

  // 3. Pip Map (Dots count)
  const pipMap = {
    2: 1, 12: 1,
    3: 2, 11: 2,
    4: 3, 10: 3,
    5: 4, 9: 4,
    6: 5, 8: 5
  };

  // 4. Port Configuration
  // Key = Water Tile Index, Value = Rotation Angle (facing the land)
  const portPositions = {
    0: 150, 2: 210,         // Top Left / Right
    9: 270, 11: 270, 13: 330, // Right Side
    16: 30, 14: 30,         // Bottom Right / Left
    7: 90, 5: 90            // Left Side
  };

  // The mix of ports to shuffle
  const portTypesSource = [
    "wood", "brick", "sheep", "wheat", "ore",
    "generic", "generic", "generic", "generic"
  ];

  // 5. Adjacency Map (Standard Spiral 0-18)
  // This defines which tiles touch each other.
  const adjacency = {
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
    10: [5, 6, 9, 11, 14, 15],
    11: [6, 10, 15],
    12: [7, 8, 13, 16],
    13: [8, 9, 12, 14, 16, 17],
    14: [9, 10, 13, 15, 17, 18],
    15: [10, 11, 14, 18],
    16: [12, 13, 17],
    17: [13, 14, 16, 18],
    18: [14, 15, 17]
  };

  // --- HELPERS ---

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Check if placing a '6' or '8' here would touch another '6' or '8'
  function hasBadNeighbor(tileIndex, currentNumber, currentTiles) {
    if (currentNumber !== 6 && currentNumber !== 8) return false;

    const neighbors = adjacency[tileIndex];
    for (let neighborId of neighbors) {
      const neighbor = currentTiles[neighborId];
      // Note: We check if neighbor exists and has a number assigned
      if (neighbor && neighbor.number !== null) {
        if (neighbor.number === 6 || neighbor.number === 8) {
          return true;
        }
      }
    }
    return false;
  }

  // --- MAIN GENERATOR ---

  genBtn.addEventListener("click", () => {
    // 1. Get Toggle Status
    // If Checked: We enforce the rule. If Unchecked: We ignore it.
    const useRedRule = toggleBtn ? toggleBtn.checked : true;

    let validMapFound = false;
    let attemptCount = 0;
    
    // We will store the final map data here
    let finalTiles = [];

    // 2. Retry Loop (to find a valid layout)
    while (!validMapFound && attemptCount < 1000) {
      attemptCount++;
      
      // A. Setup Tiles
      let currentTerrains = [...terrains];
      shuffle(currentTerrains);
      
      // Initialize tile objects
      let tempTiles = [];
      for(let i=0; i<19; i++){
        tempTiles.push({ id: i, terrain: currentTerrains[i], number: null });
      }

      // B. Setup Numbers
      let currentNumbers = [...numbers];
      shuffle(currentNumbers);

      // C. Assign Numbers
      let mapIsValid = true;
      
      for (let tile of tempTiles) {
        // Desert gets no number
        if (tile.terrain === "desert") continue;

        const num = currentNumbers.pop();
        tile.number = num;

        // D. Check the Rule (Only if Toggle is ON)
        if (useRedRule) {
          if (hasBadNeighbor(tile.id, num, tempTiles)) {
            mapIsValid = false;
            break; // Stop and retry
          }
        }
      }

      if (mapIsValid) {
        validMapFound = true;
        finalTiles = tempTiles;
      }
    }

    if (!validMapFound) {
      alert("Could not find a valid map layout in 1000 attempts. Try again!");
      return;
    }

    // --- RENDERING ---
    boardDiv.innerHTML = "";

    // 1. Shuffle Ports
    const currentPorts = [...portTypesSource];
    shuffle(currentPorts);

    // 2. Render Water & Ports (0-17)
    for (let i = 0; i < 18; i++) {
      const div = document.createElement("div");
      div.classList.add("hex", "ocean", `water-${i}`);

      if (portPositions.hasOwnProperty(i)) {
        const portType = currentPorts.pop();
        const rotation = portPositions[i];

        // Port Container
        const portDiv = document.createElement("div");
        portDiv.classList.add("port");
        portDiv.style.transform = `rotate(${rotation}deg)`;

        // Icon
        const iconDiv = document.createElement("div");
        iconDiv.classList.add("port-icon", portType);

        // Text (Counter-rotated so it is upright)
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

    // 3. Render Land & Tokens (0-18)
    finalTiles.forEach(tile => {
      const div = document.createElement("div");
      div.classList.add("hex", tile.terrain, `tile-${tile.id}`);

      // Render Token if not Desert
      if (tile.number !== null) {
        const token = document.createElement("div");
        token.classList.add("token");

        // Red Color Logic (Applies to both Number and Pips via CSS inheritance)
        if (tile.number === 6 || tile.number === 8) {
          token.style.color = "#d50000";
        }

        // Number (Top)
        const numSpan = document.createElement("span");
        numSpan.classList.add("token-number");
        numSpan.textContent = tile.number;

        // Pips (Bottom)
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
