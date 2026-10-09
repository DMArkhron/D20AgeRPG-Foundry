// Pure rules: shared by Foundry, automated checks and the visual preview.
export const ATTRIBUTES = {str: "Força", int: "Inteligência", wis: "Sabedoria", dex: "Destreza", con: "Constituição", cha: "Carisma"};
export const ATTRIBUTE_ABBR = {str: "FOR", int: "INT", wis: "SAB", dex: "DES", con: "CON", cha: "CAR"};
export const SAVES = {death: "Morte", contact: "Contato", paralysis: "Paralisia", eruption: "Irrupção", spell: "Feitiço"};
export const ITEM_TYPES = {weapon: "Arma", armor: "Proteção", equipment: "Equipamento", spell: "Magia", ability: "Habilidade"};
export const COINS = {cp: {label:"pc", value:0.01}, sp:{label:"pp", value:0.1}, ep:{label:"pe", value:0.2}, gp:{label:"po", value:1}, pp:{label:"pl", value:5}};
const commonT = [19,18,18,17,17,16,16,15,15,14];
const arcSlots = [[1,0,0,0,0],[2,0,0,0,0],[2,1,0,0,0],[2,2,0,0,0],[2,2,1,0,0],[2,2,2,0,0],[2,2,2,1,0],[2,2,2,2,0],[2,2,2,2,1],[2,2,2,2,2]];
const dwarfSaves = [[10,11,12,13,14],[8,9,10,11,12],[6,7,8,9,10],[4,5,6,7,8]];
export const CLASSES = {
  arcanist: {label:"Arcanista", die:4, move:40, xp:[0,2500,5000,10000,20000,40000,80000,150000,300000,450000], thac0:[19,19,18,18,18,17,17,17,16,16], saves:[[13,14,15,16,13],[11,12,13,14,11],[9,10,11,12,9]], cuts:[4,9], slots:arcSlots},
  fighter: {label:"Combatente", die:8, move:40, xp:[0,2000,4000,8000,16000,32000,64000,120000,240000,360000], thac0:[18,17,16,15,14,13,12,11,10,9], saves:[[12,13,14,15,16],[10,11,12,13,14],[8,9,10,11,12],[6,7,8,9,10]], cuts:[3,6,9]},
  specialist: {label:"Especialista", die:6, move:40, xp:[0,1250,2500,5000,10000,20000,40000,80000,160000,280000], thac0:commonT, saves:[[13,13,15,14,16],[11,11,13,12,14],[9,9,11,10,12]], cuts:[4,9]},
  magist: {label:"Magista", die:6, move:40, xp:[0,2250,4500,9000,18000,35000,70000,140000,270000,400000], thac0:commonT, saves:[[11,12,15,16,14],[9,10,13,14,12],[7,8,10,12,11]], cuts:[4,9], slots:[[0,0,0],[1,0,0],[2,0,0],[2,1,0],[3,1,0],[3,2,0],[4,2,0],[4,2,1],[5,2,1],[5,2,2]], hidden:1},
  dwarf: {label:"Anão", die:8, move:30, xp:[0,2200,4400,8800,17000,35000,70000,140000,270000,400000], thac0:commonT, saves:dwarfSaves, cuts:[3,6,9]},
  elf: {label:"Elfo", die:6, move:40, xp:[0,3200,6400,12800,25000,50000,100000,200000,400000,600000], thac0:commonT, saves:[[12,13,13,15,15],[10,11,11,13,13],[8,9,9,11,11],[6,7,7,9,9]], cuts:[3,6,9], slots:arcSlots},
  gnome: {label:"Gnomo", die:6, move:30, xp:[0,2000,4000,8000,16000,32000,64000,120000,240000,360000], thac0:commonT, saves:dwarfSaves, cuts:[3,6,9]}
};
export function modifier(value) {
  if (value <= 3) return -3;
  if (value <= 5) return -2;
  if (value <= 8) return -1;
  if (value <= 12) return 0;
  if (value <= 15) return 1;
  if (value <= 17) return 2;
  return 3;
}
export const signed = n => n < 0 ? String(n) : `+${n}`;
export function progression(classId, level) {
  const cls = CLASSES[classId] ?? CLASSES.fighter;
  const index = Math.max(0, Math.min(9, level - 1));
  let saveIndex = cls.cuts.findIndex(cut => index + 1 <= cut);
  if (saveIndex < 0) saveIndex = cls.saves.length - 1;
  return {classId, label:cls.label, die:cls.die, thac0:cls.thac0[index], xp:cls.xp[index], nextXp:cls.xp[index+1] ?? null,
    saves:Object.fromEntries(Object.keys(SAVES).map((key,i) => [key,cls.saves[saveIndex][i]])), slots:[...(cls.slots?.[index] ?? [0,0,0,0,0])], hidden:cls.hidden ?? 0};
}
export function loadCategory(weight,limit=2400){return weight>limit?'Acima da capacidade':weight<=400?'Leve':weight<=800?'Média':weight<=1600?'Pesada':'Sobrecarga';}
export function movement(weight, classId, base, fatigue = false) {
  const limit = classId === "gnome" ? 800 : 2400;
  const overCapacity = weight > limit;
  const overloaded = weight > 1600 || overCapacity;
  let value = base;
  if (overCapacity) value = 0;
  else if (classId === "dwarf") value = overloaded ? Math.min(base, 10) : base;
  else if (weight > 1600) value = Math.min(base, 10);
  else if (weight > 800) value = Math.min(base, 20);
  else if (weight > 400) value = Math.min(base, 30);
  if (fatigue) value = Math.max(0, value - 10);
  return {value, limit, overloaded, overCapacity,category:loadCategory(weight,limit), exploration:value * 3, running:value * 3, travel:value / 10};
}
export function attackResult({natural, total, thac0, ac = null, naturalRules = true}) {
  const reached = thac0 - total;
  return {reached, hit: naturalRules && natural === 20 ? true : naturalRules && natural === 1 ? false : ac === null ? null : reached <= ac};
}
export function deriveActor(type, system, items = []) {
  const cls = CLASSES[system.classId] ?? CLASSES.fighter;
  const p = progression(system.classId, system.level);
  const mods = Object.fromEntries(Object.keys(ATTRIBUTES).map(key => [key, modifier(system.attributes[key].value) + system.attributes[key].bonus]));
  const coins = Object.keys(COINS).reduce((sum,key) => sum + system.coins[key], 0);
  const weight = items.filter(item => ["weapon","armor","equipment"].includes(item.type) && item.system.carried)
    .reduce((sum,item) => sum + item.system.weight * item.system.quantity, system.extraWeight + coins);
  let ac = system.combat.ac;
  if (type === "character" && system.combat.autoArmor) {
    const armor = items.filter(item => item.type === "armor" && item.system.equipped && item.system.carried && item.system.quantity > 0);
    ac = Math.min(9, ...armor.filter(item => !item.system.shield).map(item => item.system.ac - item.system.magicBonus));
    // A second mundane shield does not double the normal shield benefit.
    const shield = Math.max(0, ...armor.filter(item => item.system.shield).map(item => 1 + item.system.magicBonus));
    ac -= shield;
    if (system.classId === "gnome") ac -= 1;
  }
  ac += system.combat.acAdjustment;
  const thac0 = type === "character" && system.combat.autoProgression ? p.thac0 : system.combat.thac0;
  const saves = Object.fromEntries(Object.keys(SAVES).map(key => [key, {
    target:type === "character" && system.combat.autoProgression ? p.saves[key] : system.saves[key].target,
    bonus:system.saves[key].bonus + (key === "spell" ? mods.wis : 0)
  }]));
  const move = movement(weight, type === "character" ? system.classId : "creature", system.movement.auto && type === "character" ? cls.move : system.movement.base, system.conditions.fatigue);
  const attackBonus = mods.dex + system.combat.attackBonus - system.conditions.exhaustion;
  const money = Object.entries(COINS).reduce((sum,[key,c]) => sum + system.coins[key] * c.value, 0);
  const warnings = [];
  if (system.hp.value <= 0) warnings.push("PV ≤ 0: resolver incapacitação ou morte com o mestre.");
  if (Object.values(system.attributes).some(a => a.value === 0)) warnings.push("Atributo em zero: conferir a consequência no livro.");
  if (move.overCapacity) warnings.push("Carga acima da capacidade de transporte.");
  else if (move.overloaded) warnings.push("Sobrecarga: não pode combater, correr ou usar habilidades especiais.");
  if (system.conditions.exhaustion >= 5) warnings.push(system.conditions.exhaustion >= 6 ? "Exaustão 6: morte." : "Exaustão 5: incapacitado.");
  return {progression:p, mods, weight, coinWeight:coins, itemWeight:weight-coins-system.extraWeight, money, ac, ascendingAc:19-ac, thac0, ba:19-thac0, attackBonus, saves, move, warnings,
    xpBaseBonus:system.attributes.wis.value >= 16 ? 10 : system.attributes.wis.value >= 13 ? 5 : 0, xpBonus:(system.attributes.wis.value >= 16 ? 10 : system.attributes.wis.value >= 13 ? 5 : 0)+(system.xpAdjustment??0),
    extraLanguages:Math.max(0,system.attributes.int.value - 10), literate:system.attributes.int.value > 8,
    retainers:Math.max(0,4+mods.cha) * (system.classId === "fighter" && system.level >= 7 ? 2 : 1)};
}
