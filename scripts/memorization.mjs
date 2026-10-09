import {progression} from './rules.mjs';
export function memoryLimit(system,circle){
 const base=progression(system.classId,system.level).slots[circle-1]??0;
 return system.magicCapacity?.manual?system.magicCapacity.slots?.[String(circle)]??0:base;
}
export function memoryModeUpdate(system,manual){
 const updates={'system.magicCapacity.manual':!!manual};
 if(manual&&!system.magicCapacity?.initialized){
  for(let circle=1;circle<=6;circle++)updates[`system.magicCapacity.slots.${circle}`]=progression(system.classId,system.level).slots[circle-1]??0;
  updates['system.magicCapacity.initialized']=true;
 }
 return updates;
}
export function memoryStepUpdate(system,{circle,delta}){
 circle=Number(circle);delta=Number(delta);
 if(!system.magicCapacity?.manual || !Number.isInteger(circle)||circle<1||circle>6||![-1,1].includes(delta))return null;
 return {[`system.magicCapacity.slots.${circle}`]:Math.max(0,memoryLimit(system,circle)+delta)};
}
