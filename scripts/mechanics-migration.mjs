// Seed only missing feature fields once. Never reroll established creatures on upgrade.
export const MECHANICS_VERSION='0.5.0';
const spellFields=['target','spellDamage','spellHealing','spellTemporary','spellScaling','effectAC','effectSave','effectHP','effectAttack','effectDamage','effectCondition'];
export function spellMechanicsUpdate(document,source){
 if(document.type!=='spell'||document.flags?.d20age?.mechanicsRevision===MECHANICS_VERSION)return null;
 const updates={};
 for(const key of spellFields){const current=document.system?.[key];if(current===undefined||current===null||current===''||current===0||key==='spellScaling'&&current==='none')updates['system.'+key]=source.system[key];}
 updates['flags.d20age.mechanicsRevision']=MECHANICS_VERSION;return updates;
}
export async function migrateWorldSpellMechanics(sources){
 const byId=new Map(sources.map(d=>[d._id,d])),byName=new Map(sources.map(d=>[d.name,d]));
 const sourceFor=item=>{if(item.flags?.d20age?.source!=='d20age RPG - LB (V2)')return null;const uuid=item.flags?.core?.sourceId??'';return byId.get(uuid.split('.').at(-1))??byName.get(item.name);};
 for(const item of game.items??[]){const source=sourceFor(item),update=source&&spellMechanicsUpdate(item,source);if(update)await item.update(update);}
 const actors=new Map();for(const a of game.actors??[])actors.set(a.uuid??a.id,a);for(const s of game.scenes??[])for(const t of s.tokens??[])if(t.actor)actors.set(t.actor.uuid??t.actor.id,t.actor);
 for(const actor of actors.values()){const changes=[];for(const item of actor.items??[]){const source=sourceFor(item),update=source&&spellMechanicsUpdate(item,source);if(update)changes.push({_id:item.id,...update});}if(changes.length)await actor.updateEmbeddedDocuments('Item',changes);}
}
