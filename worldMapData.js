// worldMapData.js
const WORLD_MAP_DATA = {
  "mapImage": "world_map_risk_style.png", // Poner "" si la imagen no existe aún
  "territories": {
    "territory_A": {
      "id": "territory_A",
      "name": "Gran Bretaña",
      "displayName": "Gran Bretaña",
      "adjacent": [], // Vaciado porque B y C no están definidos
      "position": {"x": 150, "y": 120},
      "scenarioFile": "BRITAIN_DEFENSE_SCENARIO", // <<<< CAMBIO AQUÍ: A MAYÚSCULAS
      "initialOwner": "player"
    }

        /*
    "territory_B": {
      "id": "territory_B",
      "name": "Europa Occidental",
      "displayName": "Europa Occ.",
      "adjacent": ["territory_A", "territory_D"],
      "position": {"x": 250, "y": 180},
      "scenarioFile": "WESTERN_EUROPE_INVASION_SCENARIO",
      "initialOwner": "ai_1"
    },
    */
    // Otros territorios comentados
  },
  "playerStartTerritory": "territory_A",
  "aiPlayers": {
    "ai_1": { "name": "Imperio Germánico", "color": "red" }
    // ai_2 no es necesario si no hay territorios que lo usen
  }
};
