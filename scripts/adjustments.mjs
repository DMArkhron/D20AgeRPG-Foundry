const attributePaths = ["str","int","wis","dex","con","cha"].map(key=>`system.attributes.${key}.bonus`);
const adjustmentPaths = new Set(["system.combat.acAdjustment","system.combat.attackBonus","system.xpAdjustment","system.hp.temp",...attributePaths]);
export function adjustmentUpdate(system,{action,path,delta,group}) {
 if (action === "adjust-step") {
  if (!adjustmentPaths.has(path) || ![-1,1].includes(Number(delta))) return null;
  const current=path.split(".").slice(1).reduce((value,key)=>value?.[key],system);
  if (!Number.isFinite(current)) return null;
  return {[path]:path==='system.hp.temp'?Math.max(0,current+Number(delta)):current+Number(delta)};
 }
 if (action === "adjust-reset") {
  const paths=group==="defense" ? ["system.combat.acAdjustment"] : group==="attack" ? ["system.combat.attackBonus"] : group==="attributes" ? attributePaths : [];
  return paths.length ? Object.fromEntries(paths.map(path=>[path,0])) : null;
 }
 return null;
}

export function commonCreatureSave(value) {
 const target=Number(value);
 if(!Number.isInteger(target)||target<1) throw new Error("Informe um alvo de SV inteiro, maior ou igual a 1.");
 return Object.fromEntries(["death","contact","paralysis","eruption","spell"].map(key=>[`system.saves.${key}.target`,target]));
}
