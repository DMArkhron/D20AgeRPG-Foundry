// Consultar tabelas
try { await game.d20age.adventureTool("reference"); } catch(error) { console.error("D20Age",error); ui.notifications.error(error.message); }
