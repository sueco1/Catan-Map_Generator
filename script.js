const boardDiv = document.getElementById("board");
const button = document.getElementById("generateBtn");

const numbers = [
  2, 3, 3, 4, 4, 5, 5,
  6, 6, 8, 8,
  9, 9, 10, 10, 11, 11, 12
];

const pipMap = {
    2: 1, 12: 1,
    3: 2, 11: 2,
    4: 3, 10: 3,
    5: 4, 9: 4,
    6: 5, 8: 5
  };

const terrains = [
  "wood", "wood", "wood", "wood",
  "sheep", "sheep", "sheep", "sheep",
  "wheat", "wheat", "wheat", "wheat",
  "brick", "brick", "brick",
  "ore", "ore", "ore",
  "desert"
];

// 5 Resource ports (2:1) + 4 Generic ports (3:1)
const portTypes = [
  "wood", "brick", "sheep", "wheat", "ore",
  "generic", "generic", "generic", "generic"
];

// Configuration: Which water tile gets a port, and the rotation to face land
// Rotation 0deg = Points Down.
const portPositions = {
  0: 330,  // Top Left Water
  2: 30,  // Top Right Water
  
  9: 30,  // Right Top Water
  11: 90, // Right Mid Water
  13: 150, // Right Bot Water

  16: 150,  // Bot Right Water
  14: 210,  // Bot Left Water
  
  7: 270,   // Left Bot Water
  5: 270    // Left Top Water
};

const neighbors = {
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

function hasBadNeighbor(tileIndex, number, tiles) {
  // Only care about 6 and 8
  if (number !== 6 && number !== 8) return false;

  for (const neighborIndex of neighbors[tileIndex]) {
    const neighbor = tiles[neighborIndex];
    if (!neighbor) continue;

    if (neighbor.number === 6 || neighbor.number === 8) {
      return true;
    }
  }
  return false;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

button.addEventListener("click", () => {
  let tiles;
  let success = false;

  while (!success) {
    // 1. Shuffle terrain
    const terrainPool = [...terrains];
    shuffle(terrainPool);

    // 2. Create empty tiles
    tiles = terrainPool.map((terrain, index) => ({
      id: index,
      terrain,
      number: terrain === "desert" ? null : undefined,
      neighbors: neighbors[index]
    }));

    // 3. Shuffle numbers
    const numberPool = [...numbers];
    shuffle(numberPool);

    success = true;

    // 4. Assign numbers with rule checking
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];

      if (tile.terrain === "desert") continue;

      let placed = false;

      for (let attempt = 0; attempt < numberPool.length; attempt++) {
        const candidate = numberPool[attempt];

        if (!hasBadNeighbor(i, candidate, tiles)) {
          tile.number = candidate;
          numberPool.splice(attempt, 1);
          placed = true;
          break;
        }
      }

      if (!placed) {
        success = false;
        break;
      }
    }
  }
  
  // --- START RENDERING ---
  boardDiv.innerHTML = "";

  // A. SHUFFLE PORTS
  const currentPorts = [...portTypes];
  shuffle(currentPorts);

  // B. GENERATE OCEAN & PORTS (18 Tiles)
  for (let i = 0; i < 18; i++) {
    const div = document.createElement("div");
    div.classList.add("hex", "ocean", `water-${i}`);
    
    // Check if this water tile gets a port
    if (portPositions.hasOwnProperty(i)) {
      const portType = currentPorts.pop();
      const rotation = portPositions[i];
      
      // 1. Create Port Container (Rotated)
      const portDiv = document.createElement("div");
      portDiv.classList.add("port");
      portDiv.style.transform = `rotate(${rotation}deg)`;
      
      // 2. Create Port Icon (The Circle)
      const iconDiv = document.createElement("div");
      iconDiv.classList.add("port-icon", portType);
      
      // 3. Create Text (Counter-Rotated)
      // We rotate the text the opposite way so it always stands upright
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

  // C. GENERATE LAND & TOKENS (19 Tiles)
  tiles.forEach(tile => {
    const div = document.createElement("div");
    div.classList.add("hex", tile.terrain, `tile-${tile.id}`);

    // If it's not a desert, add the token
    if (tile.number !== null) {
      const token = document.createElement("div");
      token.classList.add("token");

      // Handle Red Numbers (6 and 8)
      // This colors both the Number and the Pips via inheritance
      if (tile.number === 6 || tile.number === 8) {
        token.style.color = "#b71c1c";
      }

      // 1. Create Number (Top)
      const numSpan = document.createElement("span");
      numSpan.classList.add("token-number");
      numSpan.textContent = tile.number;
      token.appendChild(numSpan);

      // 2. Create Pips (Bottom)
      const pipsSpan = document.createElement("span");
      pipsSpan.classList.add("token-pips");
      const count = pipMap[tile.number] || 0;
      pipsSpan.textContent = "•".repeat(count);
      token.appendChild(pipsSpan);

      div.appendChild(token);
    }
    
    boardDiv.appendChild(div);
  });

});
