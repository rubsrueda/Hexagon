// gachaManager.js
console.log("gachaManager.js CARGADO - Motor del sistema de Deseos listo.");

const GachaManager = {

    /**
     * INICIALIZA el sistema Gacha.
     * Lee la lista de Comandantes y los clasifica en pools por rareza.
     * Debe llamarse una sola vez al cargar el juego.
     */
    init: function() {
        console.log("GachaManager: Inicializando pools de héroes...");
        const pools = {
            COMUN: [],
            RARO: [],
            EPICO: [],
            LEGENDARIO: []
        };
        // Se asume que el objeto global COMMANDERS ya está cargado.
        for (const heroId in COMMANDERS) {
            const hero = COMMANDERS[heroId];
            const rarityKey = hero.rarity
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toUpperCase();

            if (pools[rarityKey]) {
                pools[rarityKey].push(heroId);
            }
        }
        // Asigna los pools generados dinámicamente a nuestra configuración
        GACHA_CONFIG.HERO_POOLS_BY_RARITY = pools;
        console.log("Gacha Hero Pools inicializados con éxito.", GACHA_CONFIG.HERO_POOLS_BY_RARITY);
    },


    /**
     * Punto de entrada principal. Ejecuta un número de deseos (tiradas) para un banner.
     * @param {string} bannerId - El ID del banner a usar (ej: 'common', 'evento_cid').
     * @param {number} pullCount - El número de deseos a realizar (normalmente 1 o 10).
     */
    executeWish: function(bannerId, pullCount) {
        // 1. Validar y gastar la moneda
        if (!PlayerDataManager.spendWarSeals(pullCount)) {
            // spendWarSeals ya muestra un mensaje de error si no hay suficientes sellos.
            return; 
        }

        const player = PlayerDataManager.getCurrentPlayer();
        const results = [];
        
        // 2. Realizar cada una de las tiradas en un bucle
        for (let i = 0; i < pullCount; i++) {
            player.gacha_state.pulls_since_last_epic++;
            player.gacha_state.pulls_since_last_legendary++;

            let result;

            // 3. Comprobar el sistema de Pity (Misericordia)
            if (player.gacha_state.pulls_since_last_legendary >= GACHA_CONFIG.PITY_LEGENDARY) {
                console.log("%c[PITY SYSTEM] ¡Legendario garantizado!", "color: gold; font-weight: bold;");
                result = this._getReward('LEGENDARIO', bannerId);
                player.gacha_state.pulls_since_last_legendary = 0;
                player.gacha_state.pulls_since_last_epic = 0; // El pity legendario resetea ambos
            } 
            else if (pullCount === 10 && player.gacha_state.pulls_since_last_epic >= GACHA_CONFIG.PITY_EPIC) {
                console.log("%c[PITY SYSTEM] ¡Épico garantizado en tirada de 10!", "color: mediumpurple; font-weight: bold;");
                result = this._rollOnBanner(bannerId, true); // Forzar que el resultado sea al menos Épico
                if (result.rarity === 'LEGENDARIO') {
                    player.gacha_state.pulls_since_last_legendary = 0;
                    player.gacha_state.pulls_since_last_epic = 0;
                } else {
                    player.gacha_state.pulls_since_last_epic = 0;
                }
            }
            else {
                // 4. Si no hay pity, hacer una tirada normal
                result = this._rollOnBanner(bannerId, false);
                if (result.rarity === 'LEGENDARIO') {
                    player.gacha_state.pulls_since_last_legendary = 0;
                    player.gacha_state.pulls_since_last_epic = 0;
                } else if (result.rarity === 'EPICO') {
                    player.gacha_state.pulls_since_last_epic = 0;
                }
            }
            results.push(result);
        }

        // 5. Aplicar los resultados y guardar
        results.forEach(res => {
            // Usamos la función que ya existe para añadir fragmentos.
            PlayerDataManager.addFragmentsToHero(res.heroId, res.fragments);
        });
        
        PlayerDataManager.saveCurrentPlayer(); // Guardar el estado actualizado del gacha.

        // 6. Mostrar los resultados al jugador (esta función la crearemos en el siguiente paso)
        if (typeof showGachaResults === 'function') {
            showGachaResults(results);
        } else {
            console.error("La función para mostrar resultados de gacha no está definida todavía.");
        }
    },
    
    /**
     * Lanza los dados para una tirada en un banner específico, aplicando probabilidades.
     * @private
     * @param {string} bannerId - El ID del banner.
     * @param {boolean} forceAtLeastEpic - Si el pity fuerza que el resultado sea como mínimo Épico.
     * @returns {object} Un objeto de resultado con { heroId, rarity, fragments }.
     */
    _rollOnBanner: function(bannerId, forceAtLeastEpic = false) {
        // En un futuro, aquí podrías tener lógica para diferentes banners
        // const bannerData = getBannerData(bannerId);
        const odds = GACHA_CONFIG.COMMON_BANNER_ODDS;
        const roll = Math.random() * 100;
        
        let rarity;

        if (forceAtLeastEpic) {
            // Si forzamos un épico, las probabilidades se recalculan solo entre épico y legendario.
            const epicOrLegendaryTotalOdds = odds.EPICO + odds.LEGENDARIO;
            const legendaryChanceInPity = (odds.LEGENDARIO / epicOrLegendaryTotalOdds) * 100;
            if (roll < legendaryChanceInPity) {
                rarity = 'LEGENDARIO';
            } else {
                rarity = 'EPICO';
            }
        } else {
            // Tirada normal con todas las probabilidades
            if (roll < odds.LEGENDARIO) rarity = 'LEGENDARIO';
            else if (roll < odds.LEGENDARIO + odds.EPICO) rarity = 'EPICO';
            else if (roll < odds.LEGENDARIO + odds.EPICO + odds.RARO) rarity = 'RARO';
            else rarity = 'COMUN';
        }

        return this._getReward(rarity, bannerId);
    },
    
    /**
     * Otorga una recompensa de una rareza específica, seleccionando un héroe y fragmentos al azar.
     * @private
     * @param {string} rarity - La rareza determinada (ej: "RARO").
     * @param {string} bannerId - El ID del banner (para futuros héroes exclusivos).
     * @returns {object} Un objeto de resultado con { heroId, rarity, fragments }.
     */
    _getReward: function(rarity, bannerId) {
        // Aquí iría la lógica para banners de evento. Si es un banner de "El Cid",
        // y la rareza es LEGENDARIO, la probabilidad de que sea "El Cid" sería muy alta.
        
        const heroPool = GACHA_CONFIG.HERO_POOLS_BY_RARITY[rarity];
        if (!heroPool || heroPool.length === 0) {
            console.error(`¡Error de configuración! No se encontraron héroes para la rareza: ${rarity}`);
            // Fallback a un héroe común si hay un error
            const fallbackPool = GACHA_CONFIG.HERO_POOLS_BY_RARITY.COMUN;
            const heroId = fallbackPool[0];
            return { heroId: heroId, rarity: "COMUN", fragments: GACHA_CONFIG.FRAGMENTS_PER_PULL.COMUN[0] };
        }
        
        // Elige un héroe aleatorio del pool correspondiente
        const randomHeroId = heroPool[Math.floor(Math.random() * heroPool.length)];
        
        // Elige una cantidad aleatoria de fragmentos del pool correspondiente
        const fragmentPool = GACHA_CONFIG.FRAGMENTS_PER_PULL[rarity];
        const randomFragments = fragmentPool[Math.floor(Math.random() * fragmentPool.length)];

        return { heroId: randomHeroId, rarity: rarity, fragments: randomFragments };
    }
};