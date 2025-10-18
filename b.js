// En modalLogic.js, reemplaza desde openHeroDetailModal hasta handleTalentNodeClick

function openHeroDetailModal(heroInstance) {
    const modal = document.getElementById('heroDetailModal');
    if (!modal) return;

    const heroData = COMMANDERS[heroInstance.id];
    const playerData = PlayerDataManager.getCurrentPlayer();
    if (!heroData || !playerData) return;

    // --- Rellenar UI ---
    document.getElementById('hero-portrait-container').innerHTML = `<img src="${heroData.sprite}" alt="${heroData.name}">`;
    document.getElementById('heroDetailName').textContent = heroData.name;
    document.getElementById('heroDetailTitle').textContent = heroData.title;
    
    const currentLevel = heroInstance.level;
    const xpForNextLevel = getXpForNextLevel(currentLevel);
    document.getElementById('heroDetailLevel').textContent = `${currentLevel} (${heroInstance.skill_points_unspent || 0} Ptos.)`;
    document.getElementById('heroDetailXpBar').style.width = `${xpForNextLevel === 'Max' ? 100 : (heroInstance.xp / xpForNextLevel) * 100}%`;
    document.getElementById('heroDetailXpText').textContent = `${heroInstance.xp} / ${xpForNextLevel}`;

    const nextStar = heroInstance.stars + 1;
    const fragmentsNeeded = HERO_FRAGMENTS_PER_STAR[nextStar] || 'Max';
    document.getElementById('heroDetailStars').textContent = '⭐'.repeat(heroInstance.stars);
    document.getElementById('heroDetailFragmentBar').style.width = `${fragmentsNeeded === 'Max' ? 100 : (heroInstance.fragments / fragmentsNeeded) * 100}%`;
    document.getElementById('heroDetailFragmentText').textContent = `${heroInstance.fragments} / ${fragmentsNeeded}`;
    
    // --- REPARACIÓN DE BOTONES ---
    const levelUpBtn = document.getElementById('heroLevelUpBtn');
    levelUpBtn.disabled = (playerData.inventory.xp_books || 0) <= 0 || xpForNextLevel === 'Max';
    // Se asigna el onclick CADA VEZ que se abre el modal para asegurar que funciona
    levelUpBtn.onclick = () => {
        PlayerDataManager.useXpBook(heroInstance.id);
        // Volvemos a abrir el modal con los datos frescos del héroe para reflejar el cambio
        const updatedHero = PlayerDataManager.currentPlayer.heroes.find(h => h.id === heroInstance.id);
        if (updatedHero) openHeroDetailModal(updatedHero);
    };

    const evolveBtn = document.getElementById('heroEvolveBtn');
    evolveBtn.disabled = heroInstance.fragments < fragmentsNeeded || fragmentsNeeded === 'Max';
    evolveBtn.onclick = () => {
        PlayerDataManager.evolveHero(heroInstance.id);
        const updatedHero = PlayerDataManager.currentPlayer.heroes.find(h => h.id === heroInstance.id);
        if (updatedHero) openHeroDetailModal(updatedHero);
    };
    
    // --- Lógica de Habilidades (sin cambios) ---
    const skillsContainer = document.getElementById('heroDetailSkillsContainer');
    skillsContainer.innerHTML = ''; // Limpiar
    // ... tu bucle forEach para rellenar las habilidades va aquí ...

    // --- Lógica de Footer y Botón de Talentos ---
    const talentBtn = document.getElementById('openTalentTreeBtn');
    talentBtn.onclick = () => {
        modal.style.display = 'none';
        openTalentModalForHero(heroInstance);
    };
    
    modal.style.display = 'flex';
}

// ... (El resto de tus funciones como openSkillDetailModal se mantienen igual) ...

// --- FUNCIÓN DE GASTO DE TALENTOS (CON LOG) ---
function handleTalentNodeClick(heroId, talentId) {
    console.log(`[handleTalentNodeClick] Clic detectado para Héroe: ${heroId}, Talento: ${talentId}. Llamando a PlayerDataManager...`);
    
    const success = PlayerDataManager.spendTalentPoint(heroId, talentId);

    if (success) {
        console.log("[handleTalentNodeClick] PlayerDataManager devolvió 'true'. Refrescando UI.");
        const updatedHeroInstance = PlayerDataManager.currentPlayer.heroes.find(h => h.id === heroId);
        if (updatedHeroInstance) {
            openTalentModalForHero(updatedHeroInstance);
        }
    } else {
        console.error("[handleTalentNodeClick] PlayerDataManager devolvió 'false'. No se refrescará la UI.");
    }
}