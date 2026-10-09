// Aplicar dano ou cura
try { await game.d20age.adventureTool("hp"); } catch(error) { console.error("D20Age",error); ui.notifications.error(error.message); }
