// Salvaguarda
try { await game.d20age.adventureTool("save"); } catch(error) { console.error("D20Age",error); ui.notifications.error(error.message); }
