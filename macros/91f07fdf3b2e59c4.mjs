// Ajustar exaustão
try { await game.d20age.adventureTool("exhaustion"); } catch(error) { console.error("D20Age",error); ui.notifications.error(error.message); }
