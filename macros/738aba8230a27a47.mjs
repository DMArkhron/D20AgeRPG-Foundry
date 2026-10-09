// Ataque da ficha
try { await game.d20age.adventureTool("attack"); } catch(error) { console.error("D20Age",error); ui.notifications.error(error.message); }
