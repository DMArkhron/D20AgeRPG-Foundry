const {NumberField, StringField, BooleanField, SchemaField} = foundry.data.fields;
const number = (initial=0, options={}) => new NumberField({required:true, nullable:false, initial, ...options});
const text = (initial="", options={}) => new StringField({required:true, nullable:false, blank:true, initial, ...options});
const bool = initial => new BooleanField({required:true, initial});
const integer = (initial=0, options={}) => number(initial,{integer:true,...options});
const keyed = (keys, make) => new SchemaField(Object.fromEntries(keys.map(key => [key,make(key)])));
export class D20AgeActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      schemaVersion:integer(1,{min:1}), classId:text("fighter",{choices:["arcanist","fighter","specialist","magist","dwarf","elf","gnome"]}),
      level:integer(1,{min:1,max:10}), title:text(), alignment:text(), xp:integer(0,{min:0}), xpAdjustment:integer(),
      attributes:keyed(["str","int","wis","dex","con","cha"],()=>new SchemaField({value:integer(10,{min:0}),bonus:integer()})),
      hp:new SchemaField({value:integer(1),max:integer(1,{min:1}),temp:integer(0,{min:0})}), hpFormula:text(), rollHPOnCreate:bool(true),
      combat:new SchemaField({thac0:integer(19),ac:integer(9),acAdjustment:integer(),attackBonus:integer(),damageBonus:integer(),autoArmor:bool(true),autoProgression:bool(true)}),
      saves:keyed(["death","contact","paralysis","eruption","spell"],()=>new SchemaField({target:integer(12,{min:1}),bonus:integer()})),
      movement:new SchemaField({base:number(40,{min:0}),auto:bool(true)}),
      conditions:new SchemaField({fatigue:bool(false),exhaustion:integer(0,{min:0,max:6})}),
      coins:keyed(["cp","sp","ep","gp","pp"],()=>integer(0,{min:0})), extraWeight:number(0,{min:0}),
      morale:integer(7,{min:2,max:12}), hitDice:text("1d8"), languages:text("Comum"), ancestry:text(),
      hiddenSpell:text(), hiddenUsed:bool(false), notes:text(), adventureNotes:text(), biography:text(),
      magicCapacity:new SchemaField({manual:bool(false),initialized:bool(false),slots:keyed(['1','2','3','4','5','6'],()=>integer(0,{min:0}))})
    };
  }
}
export class D20AgeItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {schemaVersion:integer(1,{min:1}),description:text(),quantity:integer(1,{min:0}),weight:number(0,{min:0}),capacity:number(0,{min:0}),price:number(0,{min:0}),
      carried:bool(true),equipped:bool(false),damage:text("1d6"),attackBonus:integer(),damageBonus:integer(),
      mode:text("melee",{choices:["melee","ranged","thrown"]}), strengthDamage:bool(false),range:text(),properties:text(),
      ac:integer(9),shield:bool(false),magicBonus:integer(),
      circle:integer(1,{min:1,max:6}),preparedCircle:integer(1,{min:1,max:6}),memorized:integer(0,{min:0}),used:integer(0,{min:0}),
      duration:text(),save:text(),target:text(),spellDamage:text(),spellHealing:text(),spellTemporary:text(),spellScaling:text('none',{choices:['none','missiles','level','circle','temporaryLevel']}),effectAC:integer(),effectSave:integer(),effectHP:integer(),effectAttack:integer(),effectDamage:integer(),effectCondition:text(),charges:new SchemaField({value:integer(0,{min:0}),max:integer(0,{min:0})})};
  }
}

export class D20AgePartyData extends foundry.abstract.TypeDataModel {
 static defineSchema(){const {ArrayField}=foundry.data.fields;return {
  members:new ArrayField(text(),{initial:[]}),carriers:new ArrayField(text(),{initial:[]}),
  coins:keyed(['cp','sp','ep','gp','pp'],()=>integer(0,{min:0})),extraWeight:number(0,{min:0}),notes:text()
 };}
}
