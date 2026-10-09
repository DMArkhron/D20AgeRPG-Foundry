import {D20AgePartySheet,createParty,registerPartyHooks} from './party-sheet.mjs';
import {prepareDefaultToken,migrateRoundTokens,registerCreatureTokenRolls} from './tokens.mjs';
import {openEncounterPanel,addEncounterButton} from './encounter-panel.mjs';
import {rollInitiative,addInitiativeButtons,registerInitiativeHooks} from './initiative.mjs';
import {advanceLevel,rollCreatureHP} from './health.mjs';
import {registerPauseBranding} from './pause.mjs';
import {registerSystemSettings} from './settings-ui.mjs';
import {registerCalendarHooks,openCalendar,openCalendarSummary} from './calendar.mjs';
import {migrateClassArtwork} from './class-artwork.mjs';
import {openCharacterGenerator,addGeneratorDirectoryButton} from './generator.mjs';
import {registerCompendia,installCompendia,rollBookTable,openBookReference,adventureTool} from './compendia.mjs';
import {D20AgeActorData,D20AgeItemData,D20AgePartyData} from "./models.mjs";
import {D20AgeActor,D20AgeItem} from "./documents.mjs";
import {D20AgeActorSheet,D20AgeItemSheet,D20AgeCreatureSheet,D20AgeInkActorSheet} from "./sheets.mjs";
import {CLASSES,ATTRIBUTES,SAVES} from "./rules.mjs";
import {registerWelcome,createWelcome} from "./welcome.mjs";
Hooks.once("init",()=>{
  registerSystemSettings();
  registerWelcome();
  registerCompendia();
  CONFIG.Actor.documentClass = D20AgeActor;
  CONFIG.Item.documentClass = D20AgeItem;
  CONFIG.Actor.dataModels.character = D20AgeActorData;
  CONFIG.Actor.dataModels.creature = D20AgeActorData;
  CONFIG.Actor.dataModels.party = D20AgePartyData;
  for (const type of ["weapon","armor","equipment","spell","ability"]) CONFIG.Item.dataModels[type] = D20AgeItemData;
  CONFIG.Actor.trackableAttributes = {
    character:{bar:["hp"],value:["xp","level"]},
    creature:{bar:["hp"],value:["morale"]}
  };
  const config = foundry.applications.apps.DocumentSheetConfig;
  config.registerSheet(Actor,"d20age",D20AgeActorSheet,{types:["character"],makeDefault:true,label:"D20Age · Preto e branco"});
  config.registerSheet(Actor,"d20age",D20AgeInkActorSheet,{types:["character"],makeDefault:false,label:"D20Age · Tinta e hachuras"});
  config.registerSheet(Actor,"d20age",D20AgeCreatureSheet,{types:["creature"],makeDefault:true,label:"D20Age · Criatura compacta"});
  config.registerSheet(Actor,"d20age",D20AgePartySheet,{types:["party"],makeDefault:true,label:"D20Age · Companhia"});
  config.registerSheet(Item,"d20age",D20AgeItemSheet,{types:["weapon","armor","equipment","spell","ability"],makeDefault:true,label:"D20Age · Registro"});
  game.d20age = {Actor:D20AgeActor,Item:D20AgeItem,classes:CLASSES,attributes:ATTRIBUTES,saves:SAVES,version:"0.6.1",createParty,openEncounterPanel,rollInitiative,advanceLevel,rollCreatureHP,openCalendar,openCalendarSummary,openCharacterGenerator,installCompendia,rollBookTable,openBookReference,adventureTool};
});
Hooks.on("preCreateActor",(actor,data)=>{
  if(actor.type === "party"){actor.updateSource({img:data.img||"systems/d20age/assets/party.svg",prototypeToken:{actorLink:true,bar1:{attribute:null},bar2:{attribute:null}}});return;}
  const defaults = {};
  if (!data.img) defaults.img = "systems/d20age/assets/crest.svg";
  if (!data.prototypeToken) defaults.prototypeToken = {actorLink:actor.type === "character",bar1:{attribute:"hp"}};
  actor.updateSource(defaults);
  prepareDefaultToken(actor,data);
});

Hooks.once("ready",()=>createWelcome().catch(error=>{console.error("D20Age · Capa",error);ui.notifications.error("Não foi possível preparar a cena de capa. Reabra o mundo para tentar novamente.");}));

Hooks.once("ready",()=>installCompendia().catch(error=>{console.error("D20Age · Compêndios",error);ui.notifications.error("Falha ao preparar compêndios: "+error.message+" Reabra o mundo ou execute a macro Preparar compêndios para retomar.");}));

Hooks.on('renderActorDirectory',addGeneratorDirectoryButton);

Hooks.once('ready',()=>migrateClassArtwork().catch(error=>{console.error('D20Age · Ilustrações de classe',error);ui.notifications.error('Não foi possível atualizar os retratos antigos de classe. Reabra o mundo para retomar.');}));

Hooks.on('renderActorDirectory',addEncounterButton);
Hooks.on('renderCombatTracker',addInitiativeButtons);
Hooks.on('updateJournalEntry',doc=>{if(doc.flags?.d20age?.encounterRecord){/* panel refreshes on its next action */}});
Hooks.once('ready',()=>migrateRoundTokens().catch(e=>ui.notifications.error(e.message)));
registerCreatureTokenRolls();
registerInitiativeHooks();
registerCalendarHooks();
registerPauseBranding();

registerPartyHooks();
