// map_generation_utils.js
// Herramientas para "pintar" geografía en mapas hexagonales.

// Convierte coordenadas de offset a cúbicas (necesario para la interpolación)
function offsetToCube(r, c) {
    const q = c - (r - (r & 1)) / 2;
    const s = -q - r;
    return { q, r, s };
}

// Convierte coordenadas cúbicas de nuevo a offset
function cubeToOffset(q, r) {
    const c = q + (r - (r & 1)) / 2;
    return { r, c };
}

// Interpola linealmente entre dos valores
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Interpola linealmente entre dos coordenadas cúbicas
function cubeLerp(a, b, t) {
    return {
        q: lerp(a.q, b.q, t),
        r: lerp(a.r, b.r, t),
        s: lerp(a.s, b.s, t)
    };
}

// Redondea coordenadas cúbicas fraccionarias al hexágono más cercano
function cubeRound(frac) {
    let q = Math.round(frac.q);
    let r = Math.round(frac.r);
    let s = Math.round(frac.s);

    const q_diff = Math.abs(q - frac.q);
    const r_diff = Math.abs(r - frac.r);
    const s_diff = Math.abs(s - frac.s);

    if (q_diff > r_diff && q_diff > s_diff) {
        q = -r - s;
    } else if (r_diff > s_diff) {
        r = -q - s;
    } else {
        s = -q - r;
    }
    return { q, r, s };
}

/**
 * PINCEL 1: Dibuja una línea continua de hexágonos entre dos puntos.
 * Ideal para ríos y cordilleras.
 * @param {object} start - Coordenadas de inicio {r, c}.
 * @param {object} end - Coordenadas de fin {r, c}.
 * @param {string} terrain - El tipo de terreno a dibujar (e.g., 'hills', 'water').
 * @param {number} thickness - El grosor de la línea (0 = 1 hex, 1 = 3 hex, etc.).
 * @returns {Array} Un array de objetos de hexágonos para el mapa.
 */
function generateLine(start, end, terrain, thickness = 0) {
    const lineHexes = [];
    const N = hexDistance(start.r, start.c, end.r, end.c);
    const startCube = offsetToCube(start.r, start.c);
    const endCube = offsetToCube(end.r, end.c);

    for (let i = 0; i <= N; i++) {
        const pointCube = cubeLerp(startCube, endCube, i / N);
        const roundedCube = cubeRound(pointCube);
        const offsetCoords = cubeToOffset(roundedCube.q, roundedCube.r);
        
        lineHexes.push({ ...offsetCoords, terrain });

        // Aplicar grosor
        if (thickness > 0) {
            const neighbors = getHexNeighbors(offsetCoords.r, offsetCoords.c);
            for (let j = 0; j < Math.min(neighbors.length, thickness * 2); j++){
                lineHexes.push({ ...neighbors[j], terrain });
            }
        }
    }
    return lineHexes;
}

/**
 * PINCEL 2: Crea una mancha o área de un tipo de terreno.
 * Ideal para bosques.
 * @param {object} center - Coordenadas del centro {r, c}.
 * @param {number} radius - El radio del área.
 * @param {string} terrain - El tipo de terreno a dibujar.
 * @param {number} density - De 0 a 1, qué tan denso es el área (1 = círculo sólido).
 * @returns {Array} Un array de objetos de hexágonos para el mapa.
 */
function generateBlob(center, radius, terrain, density = 0.7) {
    const blobHexes = [];
    for (let r = center.r - radius; r <= center.r + radius; r++) {
        for (let c = center.c - radius; c <= center.c + radius; c++) {
            if (hexDistance(center.r, center.c, r, c) <= radius) {
                if (Math.random() < density) {
                    blobHexes.push({ r, c, terrain });
                }
            }
        }
    }
    return blobHexes;
}

/**
 * PINCEL 3: Rellena de agua desde los bordes para crear la costa.
 * Esta función es un poco diferente. Se aplica a una lista de hexágonos de tierra.
 * @param {Array} landHexes - El array de todos los hexágonos de tierra definidos.
 * @param {number} rows - Total de filas del mapa.
 * @param {number} cols - Total de columnas del mapa.
 * @returns {Array} Un array de objetos de hexágonos de agua.
 */
function generateWaterBody(landHexes, rows, cols) {
    const waterHexes = [];
    const landSet = new Set(landHexes.map(h => `${h.r},${h.c}`));

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!landSet.has(`${r},${c}`)) {
                waterHexes.push({ r, c, terrain: 'water' });
            }
        }
    }
    return waterHexes;
}

// Versión de getHexNeighbors que no depende de la variable global 'board' para
// poder ser usada durante la fase de generación del mapa.
function getHexNeighbors_independent(r, c) {
    if (typeof r !== 'number' || typeof c !== 'number' || isNaN(r) || isNaN(c)) {
        return [];
    }
    const neighbor_directions = [
        [ {r: 0, c: +1}, {r: -1, c: 0}, {r: -1, c: -1}, {r: 0, c: -1}, {r: +1, c: -1}, {r: +1, c: 0} ], // Fila par
        [ {r: 0, c: +1}, {r: -1, c: +1}, {r: -1, c: 0}, {r: 0, c: -1}, {r: +1, c: 0}, {r: +1, c: +1} ]  // Fila impar
    ];
    const directions = neighbor_directions[r % 2];
    const neighbors = [];
    for (const dir of directions) {
        neighbors.push({ r: r + dir.r, c: c + dir.c });
    }
    return neighbors;
}