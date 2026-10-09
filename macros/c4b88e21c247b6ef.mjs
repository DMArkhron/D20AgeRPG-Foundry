// Avançar turno · 10 minutos
try { await game.d20age.adventureTool("turn"); } catch(error) { console.error("D20Age",error); ui.notifications.error(error.message); }
