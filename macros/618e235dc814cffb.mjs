const actor=canvas.tokens.controlled[0]?.actor??game.user.character; if(!actor)throw Error('Selecione um personagem.'); await actor.advanceLevel();
