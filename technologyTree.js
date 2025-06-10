// En technologyTree.js
// REEMPLAZA COMPLETAMENTE TU OBJETO TECHNOLOGY_TREE_DATA CON ESTE

const TECHNOLOGY_TREE_DATA = {
    // TIER 0 - INICIO
    "ORGANIZATION": {
        id: "ORGANIZATION",
        name: "Organización",
        description: "Fundamentos de la sociedad y el mando. Permite reclutar la unidad más básica.",
        sprite: "🤝", // Emoji de manos unidas
        cost: { researchPoints: 0 },
        unlocksUnits: ["Infantería Ligera"], 
        unlocksStructures: [],
        prerequisites: [],
        position: { x: 0, y: 0 },
        tier: 0
    },

    // =======================================================
    // RAMA DE INFRAESTRUCTURA Y ECONOMÍA (HACIA ABAJO)
    // =======================================================

    // TIER 1
    "ENGINEERING": {
        id: "ENGINEERING",
        name: "Ingeniería Civil",
        description: "Principios de construcción para conectar y desarrollar tu imperio.",
        sprite: "📐", // Emoji de escuadra
        cost: { researchPoints: 40 },
        unlocksUnits: [],
        unlocksStructures: ["Camino"],
        prerequisites: ["ORGANIZATION"],
        position: { x: 0, y: 120 },
        tier: 1
    },
    "MINING": {
        id: "MINING",
        name: "Minería",
        description: "Técnicas para la extracción eficiente de minerales y metales.",
        sprite: "⛏️", // Emoji de pico
        cost: { researchPoints: 25 },
        unlocksUnits: [],
        unlocksStructures: [],
        prerequisites: ["ORGANIZATION"],
        position: { x: 150, y: 120 },
        tier: 1
    },
    "PROSPECTING": {
        id: "PROSPECTING",
        name: "Prospección",
        description: "Técnicas para identificar y explotar mejor los filones de oro.",
        sprite: "💰", // Emoji de saco de dinero
        cost: { researchPoints: 40 },
        unlocksUnits: [],
        unlocksStructures: [],
        prerequisites: ["MINING"],
        position: { x: 250, y: 200 },
        tier: 2
    },
    "IRON_WORKING": {
        id: "IRON_WORKING",
        name: "Herrería",
        description: "El secreto para forjar hierro, un metal superior para armas y herramientas.",
        sprite: "⚙️", // Emoji de engranaje
        cost: { researchPoints: 50 },
        unlocksUnits: [],
        unlocksStructures: [],
        prerequisites: ["MINING"],
        position: { x: 150, y: 200 },
        tier: 2
    },

    // TIER 2
    "FORTIFICATIONS": {
        id: "FORTIFICATIONS",
        name: "Fortificaciones",
        description: "El arte de la defensa. Permite crear bastiones para reclutar y defender.",
        sprite: "🧱", // Emoji de ladrillos
        cost: { researchPoints: 75 },
        unlocksUnits: [],
        unlocksStructures: ["Fortaleza"],
        prerequisites: ["ENGINEERING"],
        position: { x: 0, y: 200 },
        tier: 2
    },
    
    // =======================================================
    // RAMA MILITAR (HACIA ARRIBA)
    // =======================================================

    // TIER 1 - Ramas principales
    "DRILL_TACTICS": {
        id: "DRILL_TACTICS",
        name: "Tácticas de Formación",
        description: "Entrenamiento formalizado para crear una línea de batalla sólida y resistente.",
        sprite: "⚔️", // Emoji de espadas cruzadas
        cost: { researchPoints: 25 },
        unlocksUnits: ["Infantería Pesada"],
        unlocksStructures: [],
        prerequisites: ["ORGANIZATION"],
        position: { x: -200, y: -120 },
        tier: 1
    },
    "FLETCHING": {
        id: "FLETCHING",
        name: "Emplumado",
        description: "Mejora la aerodinámica de las flechas, permitiendo el uso de arcos de guerra.",
        sprite: "🏹", // Emoji de arco y flecha
        cost: { researchPoints: 30 },
        unlocksUnits: ["Arqueros"],
        unlocksStructures: [],
        prerequisites: ["ORGANIZATION"],
        position: { x: 0, y: -120 },
        tier: 1
    },
    "ANIMAL_HUSBANDRY": {
        id: "ANIMAL_HUSBANDRY",
        name: "Ganadería",
        description: "Domesticación de caballos para el transporte y la guerra.",
        sprite: "🐎", // Emoji de caballo
        cost: { researchPoints: 35 },
        unlocksUnits: ["Caballería Ligera"],
        unlocksStructures: [],
        prerequisites: ["ORGANIZATION"],
        position: { x: 200, y: -120 },
        tier: 1
    },

    // TIER 2 - Unidades avanzadas
    "SIEGE_CRAFT": {
        id: "SIEGE_CRAFT",
        name: "Arte del Asedio",
        description: "Técnicas para construir y operar armas de asedio pesadas.",
        sprite: "💣", // Emoji de bomba
        cost: { researchPoints: 50 },
        unlocksUnits: ["Artillería"],
        unlocksStructures: [],
        prerequisites: ["DRILL_TACTICS", "ENGINEERING"],
        position: { x: -200, y: -220 },
        tier: 2
    },
    "GUNPOWDER": {
        id: "GUNPOWDER",
        name: "Pólvora",
        description: "Un descubrimiento revolucionario que cambia la faz de la guerra a distancia.",
        sprite: "💥", // Emoji de explosión
        cost: { researchPoints: 70 },
        unlocksUnits: ["Arcabuceros"],
        unlocksStructures: [],
        prerequisites: ["FLETCHING", "IRON_WORKING"],
        position: { x: 0, y: -220 },
        tier: 2
    },
    "STIRRUPS": {
        id: "STIRRUPS",
        name: "Estribos",
        description: "Permite a los jinetes luchar eficazmente desde la montura con armadura pesada.",
        sprite: "🏇", // Emoji de jinete
        cost: { researchPoints: 60 },
        unlocksUnits: ["Caballería Pesada"],
        unlocksStructures: [],
        prerequisites: ["ANIMAL_HUSBANDRY", "IRON_WORKING"],
        position: { x: 200, y: -220 },
        tier: 2
    },

    // TIER 3 - Unidad de Élite
    "MOUNTED_ARCHERY": {
        id: "MOUNTED_ARCHERY",
        name: "Arquería Montada",
        description: "Combina la movilidad de la caballería con el alcance de los arqueros.",
        sprite: "🐎🏹", // Combinación de emojis
        cost: { researchPoints: 90 },
        unlocksUnits: ["Arqueros a Caballo"],
        unlocksStructures: [],
        prerequisites: ["STIRRUPS", "FLETCHING"],
        position: { x: 100, y: -320 },
        tier: 3
    },

    // =======================================================
    // RAMA DE PRODUCCIÓN DE RECURSOS (Separada y simple)
    // =======================================================
    "FORESTRY": {
        id: "FORESTRY",
        name: "Silvicultura",
        description: "Gestión sostenible y eficiente de los recursos madereros.",
        sprite: "🌳", // Emoji de árbol
        cost: { researchPoints: 30 },
        unlocksUnits: [],
        unlocksStructures: [],
        prerequisites: ["ORGANIZATION"],
        position: { x: -300, y: 0 },
        tier: 1
    },
    "MASONRY": {
        id: "MASONRY",
        name: "Albañilería",
        description: "Técnicas avanzadas para cortar y utilizar la piedra.",
        sprite: "🗿", // Emoji de moai o piedra
        cost: { researchPoints: 30 },
        unlocksUnits: [],
        unlocksStructures: [],
        prerequisites: ["ORGANIZATION"],
        position: { x: -200, y: 0 },
        tier: 1
    },
    "SELECTIVE_BREEDING": {
        id: "SELECTIVE_BREEDING",
        name: "Cría Selectiva",
        description: "Mejora el rendimiento de los cultivos y el ganado. Aumenta la producción de Comida",
        sprite: "🌾", // Emoji de espiga de arroz
        cost: { researchPoints: 40 },
        unlocksUnits: [],
        unlocksStructures: [],
        prerequisites: ["ORGANIZATION"],
        position: { x: 200, y: 0 },
        tier: 1
    },
};

// Función para obtener los datos de una tecnología por su ID
function getTechnologyData(techId) {
    return TECHNOLOGY_TREE_DATA[techId] || null;
}

// Función para verificar si un jugador tiene los prerrequisitos para una tecnología
function hasPrerequisites(playerResearchedTechs, targetTechId) {
    const targetTech = TECHNOLOGY_TREE_DATA[targetTechId];
    if (!targetTech) return false;
    if (!targetTech.prerequisites || targetTech.prerequisites.length === 0) return true;

    for (const prereqId of targetTech.prerequisites) {
        if (!playerResearchedTechs.includes(prereqId)) {
            return false;
        }
    }
    return true;
}

// Función para obtener las tecnologías que un jugador puede investigar AHORA
function getAvailableTechnologies(playerResearchedTechs) {
    const available = [];
    for (const techId in TECHNOLOGY_TREE_DATA) {
        if (!playerResearchedTechs.includes(techId)) {
            if (hasPrerequisites(playerResearchedTechs, techId)) {
                available.push(TECHNOLOGY_TREE_DATA[techId]);
            }
        }
    }
    return available;
}