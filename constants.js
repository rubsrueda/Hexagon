// constants.js

const BOARD_ROWS = 12;
const BOARD_COLS = 15;
const BOARD_SIZES = {
    'small': { rows: 12, cols: 15 },
    'medium': { rows: 18, cols: 25 },
    'large': { rows: 24, cols: 35 }
};

const HEX_WIDTH = 50;
const HEX_HEIGHT = 57.73; // HEX_WIDTH * sqrt(3) / 2 * 2 (simplificado a HEX_WIDTH * 1.1547)
const HEX_VERT_SPACING = HEX_HEIGHT * 0.75;

const XP_LEVELS = [
    { currentLevelName: "Recluta", nextLevelXp: 0, attackBonus: 0, defenseBonus: 0 },
    { currentLevelName: "Regular", nextLevelXp: 50, attackBonus: 1, defenseBonus: 0 },
    { currentLevelName: "Veterano", nextLevelXp: 200, attackBonus: 1, defenseBonus: 1 },
    { currentLevelName: "Élite", nextLevelXp: 400, attackBonus: 2, defenseBonus: 1 },
    { currentLevelName: "Héroe", nextLevelXp: 'Max', attackBonus: 2, defenseBonus: 2 } // 'Max' no hay más niveles
];

const REGIMENT_TYPES = {
    "Infantería Ligera": { cost: { oro: 10 }, attack: 2, defense: 3, health: 10, movement: 2, sprite: '🚶', visionRange: 2, attackRange: 1, initiative: 10 , goldValueOnDestroy: 7, foodConsumption: 1},
    "Infantería Pesada": { cost: { oro: 15 }, attack: 3, defense: 5, health: 15, movement: 1, sprite: '🛡️', visionRange: 1, attackRange: 1, initiative: 5 , goldValueOnDestroy: 11, foodConsumption: 1},
    "Caballería Ligera": { cost: { oro: 20 }, attack: 4, defense: 2, health: 8, movement: 4, sprite: '🐎', visionRange: 3, attackRange: 1, initiative: 15 , goldValueOnDestroy: 14, foodConsumption: 2},
    "Caballería Pesada": { cost: { oro: 30 }, attack: 5, defense: 5, health: 16, movement: 3, sprite: '🐴', visionRange: 2, attackRange: 1, initiative: 12 , goldValueOnDestroy: 20, foodConsumption: 2},
    "Arqueros":         { cost: { oro: 18 }, attack: 3, defense: 1, health: 7, movement: 2, sprite: '🏹', visionRange: 2, attackRange: 2, initiative: 8 , goldValueOnDestroy: 12, foodConsumption: 1},
    "Arcabuceros":      { cost: { oro: 24 }, attack: 5, defense: 2, health: 8, movement: 1, sprite: '💂', isionRange: 2, attackRange: 2, initiative: 7 , goldValueOnDestroy: 18, foodConsumption: 1}, 
    "Arqueros a Caballo":{ cost: { oro: 36 }, attack: 3, defense: 3, health: 12, /* Ajuste sugerido */ movement: 4, sprite: '🏇', visionRange: 3, attackRange: 2, initiative: 16 , goldValueOnDestroy: 24, foodConsumption: 1},
    "Artillería":       { cost: { oro: 50 }, attack: 8, defense: 1, health: 5, movement: 1, sprite: '💣', visionRange: 1, attackRange: 3, initiative: 2 , goldValueOnDestroy: 40, foodConsumption: 2}
};

const SKIRMISH_VICTORY_GOLD_BONUS = 10;

const MAX_REGIMENTS_PER_DIVISION = 9

const STRUCTURE_TYPES = {
    "Camino": { cost: { piedra: 5, madera: 5 }, sprite: '🟰', defenseBonus: 0, movementBonus: 1, buildableOn: ['plains', 'hills'], upkeep: {} },
    "Fortaleza": { cost: { piedra: 50, hierro: 20, oro: 30 }, sprite: '🏰', defenseBonus: 3, allowsRecruitment: true, integrity: 100, upkeep: { comida: 2, oro: 1 }, buildableOn: ['plains', 'hills', 'city'] }
};

const UPGRADE_TO_CITY_COST = { oro: 150, piedra: 50, madera: 50, comida: 20 };

const RESOURCE_NODES_DATA = { // Información sobre tipos de nodos de recursos
    'hierro': { sprite: '⛏️', income: 3, name: 'Hierro' },
    'madera': { sprite: '🌲', income: 5, name: 'Madera' },
    'piedra': { sprite: '⛰️', income: 4, name: 'Piedra' },
    'comida': { sprite: '🌾', income: 5, name: 'Comida' },
    'oro_mina': { sprite: '💰', income: 2, name: 'Oro' }, // Mina de oro, distinto de oro por ciudad
    'Puerto': {sprite: "⚓", income: 2, name: 'Oro',  buildableOn: ["coast"]}
};

const INITIAL_PLAYER_RESOURCES = [ // Para Jugador 1 y Jugador 2
    { oro: 200, hierro: 50, piedra: 150, madera: 100, comida: 50 },
    { oro: 250, hierro: 50, piedra: 100, madera: 100, comida: 50 }
];

const RESOURCE_MULTIPLIERS = {
    BASE: 1,      // Para nodos de recurso sin estructura especial
    CAMINO: 2,    // Multiplicador si el nodo tiene un camino
    FORTALEZA: 4, // Multiplicador si el nodo tiene una fortaleza (y no es ciudad)
    CIUDAD: 8     // Multiplicador si el nodo está en una ciudad
};

const TERRAIN_TYPES = {
    plains: {
        name: "Llanura",
        movementCostMultiplier: 1.0, // Costo normal
        defenseBonus: 0,             // Sin bonus de defensa
        rangedDefenseBonus: 0,       // Sin bonus extra para ataques a distancia
        meleeAttackBonus: 0,         // Sin bonus de ataque cuerpo a cuerpo
        resourceYieldMultiplier: 1.0,
        visionPenalty: 0,
        isImpassableForLand: false,  // Las unidades terrestres pueden pasar
        minMovement: 0               // No afecta el movimiento mínimo
    },
    forest: {
        name: "Bosque",
        movementCostMultiplier: 2.0, // Más lento (ej. 2 PM por hex)
        defenseBonus: 1,             // +1 defensa general
        rangedDefenseBonus: 2,       // +2 defensa extra contra ataques a distancia (total +3)
        meleeAttackBonus: 0,
        resourceYieldMultiplier: 1.0,
        visionPenalty: 0.5,          // Penalización a la visión
        isImpassableForLand: false,
        minMovement: 1               // Movimiento mínimo de 1 (si una unidad tiene 0.5 de mov, se le da 1)
    },
    hills: {
        name: "Colinas",
        movementCostMultiplier: 2.0, // Más lento (ej. 2 PM por hex)
        defenseBonus: 1,             // +1 defensa general
        rangedDefenseBonus: 0,       // Sin bonus extra contra ataques a distancia
        meleeAttackBonus: 1,         // +1 ataque para unidades cuerpo a cuerpo
        resourceYieldMultiplier: 1.1, // Ligeramente más recursos (piedra)
        visionPenalty: 0,
        isImpassableForLand: false,
        minMovement: 1               // Movimiento mínimo de 1
    },
    water: {
        name: "Agua", 
        movementCostMultiplier: Infinity, // Intransitable para unidades terrestres
        defenseBonus: 0,             // No se defiende aquí
        rangedDefenseBonus: 0,
        meleeAttackBonus: 0,
        resourceYieldMultiplier: 0,
        visionPenalty: 0,
        isImpassableForLand: true,   // ¡Intransitable!
        minMovement: 0               // No aplica
    },
};

const AI_RESOURCE_PRIORITY = {
    'oro': 100,       // Máxima prioridad
    'comida': 80,     // Alta prioridad
    'hierro': 30,     // Media prioridad
    'piedra': 20,     // Baja prioridad
    'madera': 10      // Menor prioridad
};

const REINFORCE_COST_PER_HP_PERCENT = 1.2

const ATTRITION_DAMAGE_PER_TURN = 1; // Salud o efectivos que se pierden por atrición
const ATTRITION_FOOD_SHORTAGE_THRESHOLD = 0; // Si la comida llega a este valor, se aplica atrición a unidades no suministradas

// === Contenido para el Modal de Bienvenida y Ayuda ===
const TUTORIAL_MESSAGES = {
    title: "Bienvenido a Hex General Evolved",
    sections: [
        {
            heading: "Tu Misión",
            content: "El juego discurre entre 1800a.c. y 1800d.c. En Tierra. Eres un General al mando de un Teatro de Operaciones. Tu objetivo es dominar el territorio, gestionar tus recursos y conquistar la capital de tu enemigo. ¡La victoria te espera!"
        },
        {
            heading: "Antes de iniciar el Juego puedes decidir",
            content: "El Nivel de Recursos que encontrarás en el mapa (Mínimos, Medios, Muchos), El tamaño del mapa, la cantidad de unidades a desplegar (Fase Inicial) donde quieras."
        },
        {
            heading: "El Tablero de Juego",
            content: "El campo de batalla es un tablero de celdas hexagonales. Cada hexágono tiene un terreno (Llanuras, Bosque, etc.) y puede contener recursos (Oro, Comida, etc.)."
        },
        {
            heading: "Fases del Juego",
            content: "El juego tiene fases principales: <br>• <b>Despliegue:</b> Coloca tus unidades iniciales estratégicamente. Protege tu ciudad siempre! <br>• <b>Juego:</b> Mueve tus unidades, combate, investiga y construye. <br>• <b>Fin de Partida:</b> Cuando un jugador conquista la capital enemiga o elimina todas sus unidades."
        },
        {
            heading: "Unidades (Divisiones)",
            content: "Tus unidades se llaman Divisiones, compuestas por Regimientos. Cada tipo de Regimiento (Infantería, Caballería, Arqueros) tiene valores únicos de Ataque, Defensa, Salud y Movimiento. Ganan experiencia con la batalla."
        },
        {
            heading: "Recursos y Economía",
            content: "Domina hexágonos con recursos para aumentar tus ingresos. El Oro te permite crear nuevas unidades. La Comida es vital para mantener a tus tropas. También necesitarás Hierro, Piedra y Madera para construir estructuras."
        },
        {
            heading: "Árbol de Tecnología",
            content: "Investiga nuevas tecnologías para desbloquear unidades más avanzadas, estructuras defensivas y mejoras económicas. Accede desde el botón 💡."
        },
        {
            heading: "Controles Básicos",
            content: "• <b>Clic en hexágono/unidad:</b> Selecciona o interactúa. <br>• <b>Arrastrar tablero:</b> Panorámica del mapa. <br>• <b>Botón ►:</b> Terminar turno. <br>• <b>Botón ➕:</b> Crear nueva unidad (en fase de despliegue). <br>• <b>Botón Crear Unidad:</b> Crear nueva unidad (en ciudad o Fortaleza). <br>• <b>Botón Reforzar:</b> Refuerza unidad dañada (en ciudad o Fortaleza)."
        },
        {
            heading: "¿Necesitas ayuda?",
            content: "Si te pierdes, el panel contextual inferior te dará información y acciones disponibles. Puedes acceder al menú flotante (⋮) para opciones de guardar/cargar."
        }
    ],
    footer: "¡Mucha suerte, General! La historia espera tu legado."
};
