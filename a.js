function openTalentModalForHero(heroInstance) {
    // <<== INICIO DEL KIT DE DIAGNÓSTICO ==>>
    console.clear(); // Limpia la consola para ver solo este log
    console.log("%c--- KIT DE DIAGNÓSTICO: openTalentModalForHero ---", "color: yellow; font-size: 1.2em; background: #333;");

    // 1. ¿Se está llamando a la función? (Este log lo confirma)
    console.log("Paso 1: La función SÍ se está ejecutando.");

    // 2. ¿Qué datos estamos recibiendo?
    console.log("Paso 2: El objeto 'heroInstance' recibido es:", JSON.parse(JSON.stringify(heroInstance || {})));
    
    // 3. ¿Cuál es el valor específico que intentamos usar?
    const points = heroInstance ? heroInstance.skill_points_unspent : 'INDEFINIDO';
    console.log(`Paso 3: El valor de 'skill_points_unspent' es: ${points}`);

    const talentModal = document.getElementById('talentTreeModal');
    const heroData = COMMANDERS[heroInstance.id];
    if (!talentModal || !heroData) {
        console.error("DIAGNÓSTICO FALLIDO: El modal o los datos del comandante no existen.");
        return;
    }

    document.getElementById('talentHeroName').textContent = `Talentos de ${heroData.name}`;
    
    // 4. ¿Encontramos el elemento HTML para actualizar?
    const pointsSpan = document.getElementById('talentPointsAvailable');
    if (pointsSpan) {
        console.log("Paso 4: El elemento 'talentPointsAvailable' SÍ fue encontrado en el DOM.");
        // 5. Intentamos escribir el valor
        pointsSpan.textContent = (heroInstance.skill_points_unspent || 0);
        console.log(`Paso 5: Se acaba de escribir el valor "${pointsSpan.textContent}" en el HTML.`);
    } else {
        console.error("DIAGNÓSTICO FALLIDO: El elemento con id 'talentPointsAvailable' NO FUE ENCONTRADO.");
    }
    
    document.getElementById('closeTalentTreeModalBtn').onclick = () => { talentModal.style.display = 'none'; };

    // El resto de tu función (dibujar el árbol, etc.) se mantiene igual
    const canvasContainer = document.getElementById('talentCanvasContainer');
    canvasContainer.innerHTML = `<div class="talent-tree-canvas"></div>`;
    const treeCanvas = canvasContainer.querySelector('.talent-tree-canvas');
    drawCompleteTalentLayout(heroInstance, treeCanvas);
    
    talentModal.style.display = 'flex';
    requestAnimationFrame(() => {
        canvasContainer.scrollTop = (treeCanvas.scrollHeight - canvasContainer.clientHeight) / 2;
        canvasContainer.scrollLeft = (treeCanvas.scrollWidth - canvasContainer.clientWidth) / 2;
    });

    // 6. La prueba final: ¿Alguien sobreescribe nuestro valor?
    setTimeout(() => {
        const finalValue = document.getElementById('talentPointsAvailable').textContent;
        if (finalValue !== String(heroInstance.skill_points_unspent || 0)) {
            console.error(`Paso 6: ¡FALLO DE SOBREESCRITURA! Se esperaba "${heroInstance.skill_points_unspent || 0}" pero el valor final es "${finalValue}". Otro script lo ha modificado.`);
        } else {
            console.log(`%cPaso 6: VERIFICACIÓN CORRECTA. El valor "${finalValue}" se ha mantenido.`, "color: lightgreen;");
        }
        console.log("%c--- FIN DEL KIT DE DIAGNÓSTICO ---", "color: yellow; font-size: 1.2em; background: #333;");
    }, 100); // Se ejecuta 100ms después
    // <<== FIN DEL KIT DE DIAGNÓSTICO ==>>
}