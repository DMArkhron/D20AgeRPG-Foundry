// Enviar descrição ao chat
try { await game.d20age.adventureTool("description"); } catch(error) { console.error("D20Age",error); ui.notifications.error(error.message); }
