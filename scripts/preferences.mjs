export const DEFAULT_MEASURES={distance:'ft',weight:'cn',volume:'l'};
export const DEFAULT_COMBAT={initiative:'1d6',roundSeconds:10,turnMinutes:10,naturalRules:true,critical:'normal',defense:'descending'};
export const UNIT_TABLE={distance:{ft:{label:'pés',factor:1},m:{label:'m',factor:.3048}},weight:{cn:{label:'cn',factor:1},kg:{label:'kg',factor:.05},lb:{label:'lb',factor:.110231131}},volume:{l:{label:'L',factor:1},gal:{label:'gal (EUA)',factor:1/3.785411784},ft3:{label:'pés³',factor:1/28.316846592}}};
export function preference(key,defaults){try{return {...defaults,...globalThis.game?.settings?.get('d20age',key)}}catch{return {...defaults}}}
export const measures=()=>preference('measures',DEFAULT_MEASURES);
export const combatRules=()=>preference('combatRules',DEFAULT_COMBAT);
export function convertMeasure(value,kind,unit,inverse=false){const entry=UNIT_TABLE[kind]?.[unit];if(!entry||!Number.isFinite(Number(value)))throw Error('Medida inválida.');return Number(value)*(inverse?1/entry.factor:entry.factor)}
export function formattedMeasure(value,kind,prefs=measures()){const unit=prefs[kind];return `${convertMeasure(value,kind,unit).toLocaleString('pt-BR',{maximumFractionDigits:2})} ${UNIT_TABLE[kind][unit].label}`}
export function unitField(path,value,label,prefs=measures()){
 const kind=path==='system.movement.base'?'distance':['system.weight','system.extraWeight'].includes(path)?'weight':path==='system.capacity'?'volume':null;
 return kind?{value:Number(convertMeasure(value??0,kind,prefs[kind]).toFixed(6)),label:label.replace(/\s*\((cn|pés|L)\)/g,'')+` (${UNIT_TABLE[kind][prefs[kind]].label})`,step:'any'}:{value,label};
}
export function normalizeUnitForm(data,prefs=measures()){const result={...data};for(const [path,kind]of [['system.movement.base','distance'],['system.weight','weight'],['system.extraWeight','weight'],['system.capacity','volume']])if(path in result)result[path]=Number(convertMeasure(result[path],kind,prefs[kind],true).toFixed(6));return result}
export function validateMeasures(data){for(const kind of Object.keys(DEFAULT_MEASURES))if(!UNIT_TABLE[kind][data[kind]])throw Error('Unidade inválida.');return Object.fromEntries(Object.keys(DEFAULT_MEASURES).map(k=>[k,data[k]]))}
export function validateCombat(data){const d={...DEFAULT_COMBAT,...data};if(!['1d6','1d10','1d20'].includes(d.initiative)||!['normal','doubleDice'].includes(d.critical)||!['descending','ascending'].includes(d.defense))throw Error('Regra de combate inválida.');for(const key of ['roundSeconds','turnMinutes']){d[key]=Number(d[key]);if(!Number.isInteger(d[key])||d[key]<1||d[key]>3600)throw Error('Duração inválida.')}d.naturalRules=Boolean(d.naturalRules);return d}
export function applyCombatConfiguration(){const c=combatRules();CONFIG.Combat.initiative={formula:c.initiative,decimals:0};if(CONFIG.time)CONFIG.time.roundTime=c.roundSeconds}
