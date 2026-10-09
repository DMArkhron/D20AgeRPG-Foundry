import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {defaults,StubActor} from './foundry-stub.mjs';
import {D20AgePartyData} from '../scripts/models.mjs';
import {D20AgePartySheet} from '../scripts/party-sheet.mjs';
import {partyView} from '../scripts/party-view.mjs';
import {packAnimalDocuments,openPackAnimals,PACK_ANIMALS_COLLECTION} from '../scripts/pack-animals.mjs';
const book=JSON.parse(fs.readFileSync(new URL('../content/bestiary.json',import.meta.url)));
test('group navigation avoids the Foundry-reserved tab action, including read-only sheets',async()=>{
 const actor=new StubActor({type:'party',system:defaults(D20AgePartyData)});actor.uuid='Actor.party';actor.flags={};actor.testUserPermission=()=>false;
 const sheet=new D20AgePartySheet(actor);sheet.isEditable=false;
 const html=partyView(actor,[],{user:{isGM:false}});
 assert.ok(!html.includes('data-action="tab"'));assert.ok(!html.includes('data-tab='));
 for(const section of ['notes','history','inventory']){await sheet._onClickAction({}, {dataset:{action:'party-section',section}});assert.equal(sheet._tab,section);assert.equal(sheet.rendered,true);}
});
test('pack animal compendium contains six book entries with ready capacities and preserved source data',()=>{
 const docs=packAnimalDocuments(book);assert.equal(docs.length,6);assert.equal(new Set(docs.map(d=>d._id)).size,6);
 for(const doc of docs){assert.equal(doc.folder,null);assert.equal(doc.prototypeToken.actorLink,true);assert.ok(doc.flags.d20age.packAnimal.profile);assert.deepEqual(doc.items,book.find(d=>d._id===doc._id).items);}
 assert.equal(docs.find(d=>d.name.startsWith('Mula')).flags.d20age.packAnimal.profile,'mule');
});
test('animal button opens a real compendium, fills only missing entries and preserves custom changes',async()=>{
 game.user={isGM:true};game.packs=new Map();globalThis.fetch=async()=>({ok:true,json:async()=>book});
 let creations=0,renders=0;const index=new Map();const pack={documentName:'Actor',collection:PACK_ANIMALS_COLLECTION,locked:false,getIndex:async()=>index,render(force){assert.equal(force,true);renders++;},documentClass:{createDocuments:async docs=>{creations++;for(const d of docs)index.set(d._id,d);}}};
 foundry.documents={collections:{CompendiumCollection:{createCompendium:async data=>{assert.equal(data.label,'D20Age · Bestas de carga');game.packs.set(PACK_ANIMALS_COLLECTION,pack);return pack;}}}};
 await openPackAnimals();assert.equal(index.size,6);index.values().next().value.name='Animal personalizado';await openPackAnimals();assert.equal(creations,1);assert.equal(renders,2);assert.equal(index.values().next().value.name,'Animal personalizado');
});
