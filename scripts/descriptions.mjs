import {formattedMeasure} from './preferences.mjs';
import {chatCard} from "./chat.mjs";
import {ITEM_TYPES,signed} from "./rules.mjs";
export function itemDescriptionCard(item) {
 const s=item.system,rows=[];
 if(item.type==="weapon") rows.push(["Dano",s.damage],["Acerto",signed(s.attackBonus)],["Bônus de dano",signed(s.damageBonus)],["Ataque",{melee:"Corpo a corpo",ranged:"Projétil",thrown:"Arremesso"}[s.mode]]);
 if(item.type==="armor") rows.push(["Proteção",s.shield ? "Escudo" : `CA ${s.ac}`],["Bônus mágico",signed(s.magicBonus)]);
 if(item.type==="spell") rows.push(["Círculo",s.circle]);
 if(s.range) rows.push(["Alcance",s.range]);
 if(s.duration) rows.push(["Duração",s.duration]);
 if(s.target) rows.push(["Alvo",s.target]);
 if(["weapon","armor","equipment"].includes(item.type)) rows.push(["Peso unitário",formattedMeasure(s.weight,"weight")]);
 if(s.capacity) rows.push(["Capacidade",formattedMeasure(s.capacity,"volume")]);
 if(s.properties&&item.type!=="spell") rows.push(["Propriedades",s.properties]);
 return chatCard({type:item.type==="spell" ? "spell" : item.type==="weapon" ? "attack" : "description",title:item.name,subtitle:`${ITEM_TYPES[item.type]} · descrição`,rows,description:s.description||"Descrição ainda não preenchida."});
}
