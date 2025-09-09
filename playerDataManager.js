// Esta función debe estar FUERA del objeto PlayerDataManager.
function getXpForNextLevel(currentLevel) {
    if (currentLevel >= HERO_PROGRESSION_CONFIG.MAX_LEVEL) {
        return 'Max';
    }
    const { BASE_XP, POWER } = HERO_PROGRESSION_CONFIG;
    const xpNeeded = Math.floor(BASE_XP * Math.pow(currentLevel, POWER));
    return xpNeeded === 0 ? BASE_XP : xpNeeded;
}

const PlayerDataManager = {
    currentPlayer: null,

    // Función de "hash" simple para no guardar contraseñas en texto plano.
    // En un entorno real, esto sería una librería criptográfica.
    _hash: function(str) {
        return btoa(str);
    },

    /**
     * (NUEVO Y MEJORADO) Intenta iniciar sesión, valida o crea un usuario.
     * @param {string} username - El nombre del jugador.
     * @param {string} password - La contraseña del jugador.
     * @returns {object} Un objeto con { success: boolean, message: string }
     */
    login: function(username, password) {
        if (!username || !password) return { success: false, message: "Usuario y contraseña no pueden estar vacíos." };

        const playerDataKey = `player_${username.trim().toLowerCase()}`;
        let playerDataString = localStorage.getItem(playerDataKey);

        // CASO 1: El usuario NO existe
        if (!playerDataString) {
            if (confirm(`El General "${username}" no existe. ¿Quieres crear un nuevo perfil con esta contraseña?`)) {
                this.currentPlayer = this.createNewPlayer(username, password);
                this.saveCurrentPlayer();
                return { success: true, message: "Nuevo perfil creado con éxito." };
            } else {
                return { success: false, message: "Creación de perfil cancelada." };
            }
        }
        // CASO 2: El usuario SÍ existe
        else {
            const loadedPlayer = JSON.parse(playerDataString);
            const hashedPassword = this._hash(password);

            // Comparar contraseñas hasheadas
            if (loadedPlayer.credentials.passwordHash === hashedPassword) {
                // (Aquí va tu lógica de "migración" para perfiles antiguos)
                if (loadedPlayer.heroes) {
                    loadedPlayer.heroes.forEach(hero => {
                        if (typeof hero.skill_levels === 'undefined') {
                            hero.skill_levels = { active: 1, passive1: 0, passive2: 0, passive3: 0 };
                        }
                        if (typeof hero.skill_points_unspent === 'undefined') {
                            hero.skill_points_unspent = 0;
                        }
                    });
                }
                this.currentPlayer = loadedPlayer;
                localStorage.setItem('lastUser', this.currentPlayer.username);
                return { success: true, message: "Sesión iniciada." };
            } else {
                return { success: false, message: "Contraseña incorrecta." };
            }
        }
    },
    
    /**
     * (NUEVO) Carga un perfil sin validación de contraseña, para el auto-login.
     */
    autoLogin: function(username) {
        const playerDataKey = `player_${username.trim().toLowerCase()}`;
        let playerDataString = localStorage.getItem(playerDataKey);
        if(playerDataString){
            this.currentPlayer = JSON.parse(playerDataString);
            return true;
        }
        return false;
    },

    logout: function() {
        this.currentPlayer = null;
        localStorage.removeItem('lastUser');
        console.log("Sesión cerrada.");
    },

    createNewPlayer: function(username, password) {
        return {
            username: username.trim(),
            credentials: {
                passwordHash: this._hash(password)
            },
            stats: { battlesWon: 0, battlesLost: 0, campaignsCompleted: 0 },
            currencies: { gold: 500, gems: 100, edicts: 10, influence: 0 },
            heroes: [{ id: "g_fabius", level: 1, xp: 0, stars: 1, fragments: 0, skill_levels: { active: 1, passive1: 0, passive2: 0, passive3: 0 }, skill_points_unspent: 0 }],
            inventory: { xp_books: 10, ascension_materials: {} }
        };
    },
    
    addFragmentsToHero: function(heroId, amount) {
        if (!this.currentPlayer) return;

        let heroInstance = this.currentPlayer.heroes.find(h => h.id === heroId);
        
        // Si el jugador no tiene ni una instancia del héroe (ni siquiera "bloqueada")
        if (!heroInstance) {
            console.log(`Creando nueva entrada para fragmentos de un héroe no poseído: ${heroId}`);
            heroInstance = {
                id: heroId,
                level: 0,       // Nivel 0 indica que no está "activo"
                xp: 0,
                stars: 0,       // Estrellas 0 indica que está bloqueado
                fragments: 0,
                skill_levels: { active: 1, passive1: 0, passive2: 0, passive3: 0 },
                skill_points_unspent: 0
            };
            this.currentPlayer.heroes.push(heroInstance);
        }

        heroInstance.fragments += amount;
        logMessage(`Has obtenido ${amount} fragmentos de ${COMMANDERS[heroId].name}. Total: ${heroInstance.fragments}.`);
        
        // Aquí se podría añadir la lógica para "desbloquear" al héroe si alcanza los fragmentos necesarios.
        // Lo dejaremos para la Fase 2 para mantener los pasos claros.
    },

    useXpBook: function(heroId) {
        if (!this.currentPlayer) return;

        const hero = this.currentPlayer.heroes.find(h => h.id === heroId);
        const playerInventory = this.currentPlayer.inventory;

        if (!hero || (playerInventory.xp_books || 0) <= 0 || hero.level >= HERO_PROGRESSION_CONFIG.MAX_LEVEL) {
            let reason = !hero ? "Héroe no encontrado." 
                    : (playerInventory.xp_books || 0) <= 0 ? "No tienes libros de XP."
                    : "El Héroe ya está al nivel máximo.";
            if(typeof logMessage === 'function') logMessage(`No se puede usar el libro: ${reason}`, 'warning');
            return;
        }

        playerInventory.xp_books--;
        hero.xp += HERO_PROGRESSION_CONFIG.XP_PER_BOOK;

        // --- LÓGICA DE SUBIDA DE NIVEL Y PUNTOS DE HABILIDAD ---
        let xpNeeded = getXpForNextLevel(hero.level);
        while (xpNeeded !== 'Max' && hero.xp >= xpNeeded) {
            hero.level++;
            hero.xp -= xpNeeded; 
            
            // <<== Otorgar un Punto de Habilidad por cada nivel subido ==>>
            hero.skill_points_unspent = (hero.skill_points_unspent || 0) + 1;
            logMessage(`¡${COMMANDERS[hero.id].name} ha subido al nivel ${hero.level}! Has ganado 1 Punto de Habilidad.`, 'success');
            
            xpNeeded = getXpForNextLevel(hero.level);
        }
        
        this.saveCurrentPlayer();
    },

    /**
     * Gasta un punto de habilidad para mejorar una habilidad específica de un Héroe.
     */
    upgradeHeroSkill: function(heroId, skillKey) {
        if (!this.currentPlayer) return;
        const hero = this.currentPlayer.heroes.find(h => h.id === heroId);

        if (!hero || (hero.skill_points_unspent || 0) <= 0) {
            logMessage("No tienes puntos de habilidad para gastar.", "warning");
            return;
        }

        // Comprobar que la habilidad no esté ya al máximo (nivel 5)
        if (hero.skill_levels[skillKey] >= 5) {
             logMessage("Esta habilidad ya está al nivel máximo.", "warning");
            return;
        }

        // Gastar el punto y subir el nivel de la habilidad
        hero.skill_points_unspent--;
        hero.skill_levels[skillKey]++;
        
        logMessage(`¡Habilidad mejorada a nivel ${hero.skill_levels[skillKey]}!`, "success");
        this.saveCurrentPlayer();
    },

    /**
     * Evoluciona a un héroe al siguiente nivel de estrellas si tiene suficientes fragmentos.
     * @param {string} heroId - El ID del héroe a evolucionar.
     */
    evolveHero: function(heroId) {
        if (!this.currentPlayer) return;
        const hero = this.currentPlayer.heroes.find(h => h.id === heroId);
        if (!hero) return;

        const nextStar = hero.stars + 1;
        const fragmentsNeeded = HERO_FRAGMENTS_PER_STAR[nextStar];

        if (!fragmentsNeeded) {
            logMessage(`${COMMANDERS[hero.id].name} ya ha alcanzado la evolución máxima.`);
            return;
        }

        if (hero.fragments >= fragmentsNeeded) {
            hero.fragments -= fragmentsNeeded;
            hero.stars = nextStar;
            logMessage(`¡${COMMANDERS[hero.id].name} ha evolucionado a ${hero.stars} estrellas!`, 'success');
            this.saveCurrentPlayer();
        } else {
            logMessage(`No tienes suficientes fragmentos para evolucionar a ${COMMANDERS[hero.id].name}.`, 'warning');
        }
    },

    /**
     * Guarda los datos del jugador actual en localStorage.
     */
    saveCurrentPlayer: function() {
        if (this.currentPlayer) {
            const playerDataKey = `player_${this.currentPlayer.username.toLowerCase()}`;
            localStorage.setItem(playerDataKey, JSON.stringify(this.currentPlayer));
            console.log(`Datos de ${this.currentPlayer.username} guardados.`);
        }
    },

    getCurrentPlayer: function() {
        return this.currentPlayer;
    }
};