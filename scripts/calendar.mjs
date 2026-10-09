import {GREGORIAN,validateCalendar,calendarCanEdit,currentSeconds,secondsToDate,dateToSeconds,daySeconds,shiftMonth,validateEvent} from './calendar-core.mjs';
import {calendarView,calendarSummaryView} from './calendar-view.mjs';
import {combatRules} from './preferences.mjs';
const {ApplicationV2}=foundry.applications.api;
export const calendarConfiguration=()=>{try{return game.settings.get('d20age','calendarConfig')??{activeId:'gregorian',definitions:[GREGORIAN]}}catch{return {activeId:'gregorian',definitions:[GREGORIAN]}}};
export const calendarDocument=()=>game.journal?.find(x=>x.getFlag('d20age','calendarRecord'));
export function calendarContext(){const doc=calendarDocument();const config=calendarConfiguration();const definition=validateCalendar(config.definitions.find(x=>x.id===config.activeId)??GREGORIAN);const state=doc?.getFlag('d20age','calendarState')??{seconds:0,anchor:game.time?.worldTime??0,events:[]};return {doc,definition,state,seconds:currentSeconds(state,game.time?.worldTime??0),editable:calendarCanEdit(game.user,doc)&&!!doc}}
export async function ensureCalendar(){if(calendarDocument()||!game.user.isGM||game.users?.activeGM&&game.users.activeGM.id!==game.user.id)return calendarDocument();return JournalEntry.create({name:'D20Age · Calendário da campanha',ownership:{default:CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER},flags:{d20age:{calendarRecord:true,calendarState:{seconds:0,anchor:game.time.worldTime,linkWorldTime:true,events:[]}}}})}
export async function mutateCalendar(operation){const c=calendarContext();if(!c.doc||!calendarCanEdit(game.user,c.doc))throw Error('O mestre não autorizou você a editar o calendário.');const state=structuredClone(c.state);await operation(state,c);if(state.seconds<0||!Number.isFinite(state.seconds))throw Error('Instante inválido.');secondsToDate(state.seconds,c.definition);return c.doc.update({'flags.d20age.calendarState':state})}
export async function setCalendarSeconds(seconds){return mutateCalendar(state=>{state.seconds=seconds;state.anchor=game.time.worldTime})}
export async function advanceCalendar(seconds){const c=calendarContext();if(!c.editable)throw Error("O mestre não autorizou a edição.");secondsToDate(c.seconds+seconds,c.definition);if(game.user.isGM&&c.state.linkWorldTime!==false)return game.time.advance(seconds);return setCalendarSeconds(c.seconds+seconds)}
export async function saveCalendarEvent(event){return mutateCalendar((state,c)=>{const clean=validateEvent({...event,calendarId:c.definition.id},c.definition);state.events??=[];const i=state.events.findIndex(x=>x.id===clean.id);if(i<0){if(state.events.length>=2000)throw Error('Limite de 2000 eventos atingido.');state.events.push(clean)}else state.events[i]=clean})}
export async function removeCalendarEvent(id){return mutateCalendar(state=>state.events=(state.events??[]).filter(x=>x.id!==id))}
const fragment=html=>{const t=document.createElement('template');t.innerHTML=html;return t.content};
const apps=new Set();
export class CalendarApp extends ApplicationV2{
 static DEFAULT_OPTIONS={classes:['d20age-sheet','d20age-calendar'],position:{width:850,height:900},window:{title:'D20Age · Calendário',resizable:true}};
 constructor(...args){super(...args);apps.add(this)}
 async _renderHTML(){const c=calendarContext();if(this.viewDate&&!c.definition.months[this.viewDate.month]){this.viewDate=null;this.selected=null}return fragment(calendarView(c.state,c.definition,c.seconds,{editable:c.editable,viewDate:this.viewDate,selected:this.selected,editEvent:this.editEvent}))}
 _replaceHTML(result,content){content.replaceChildren(result)}
 async _onRender(context,options){await super._onRender(context,options);this.element.querySelector("form")?.addEventListener("submit",event=>event.preventDefault())}
 async _onClickAction(event,target){event.preventDefault();try{const c=calendarContext(),now=secondsToDate(c.seconds,c.definition),a=target.dataset.action;
  if(a==='month'){this.viewDate=shiftMonth(this.viewDate??now,Number(target.dataset.delta),c.definition);return this.render({force:true})}
  if(a==='today'){this.viewDate=null;this.selected=null;this.editEvent=null;return this.render({force:true})}
  if(a==='day'){this.selected={...(this.viewDate??now),day:Number(target.dataset.day)};this.editEvent=null;return this.render({force:true})}
  if(a==='open')return openCalendar();
  if(!c.editable)throw Error('Você tem permissão apenas para consultar.');
  if(a==='advance')await advanceCalendar(Number(target.dataset.days)*daySeconds(c.definition));
  if(a==='advance-month')await setCalendarSeconds(dateToSeconds(shiftMonth(now,1,c.definition),c.definition));
  if(a==='round')await advanceCalendar(combatRules().roundSeconds);
  if(a==='turn')await advanceCalendar((target.dataset.delta==='-1'?-1:1)*combatRules().turnMinutes*60);
  if(a==='set-date'){const f=new FormData(target.closest('form'));await setCalendarSeconds(dateToSeconds(Object.fromEntries(['year','month','day','hour','minute'].map(k=>[k,Number(f.get(k))])),c.definition));this.selected=null;this.viewDate=null}
  if(a==='edit-event'){this.editEvent=target.dataset.id;return this.render({force:true})}
  if(a==='cancel-event'){this.editEvent=null;return this.render({force:true})}
  if(a==='save-event'){const f=new FormData(target.closest('form'));await saveCalendarEvent({...this.selected??now,id:this.editEvent??foundry.utils.randomID(),title:f.get('eventTitle'),notes:f.get('eventNotes')});this.editEvent=null}
  if(a==='delete-event'){if(await foundry.applications.api.DialogV2.confirm({window:{title:'Excluir evento'},content:'<p>Excluir este evento público?</p>'}))await removeCalendarEvent(target.dataset.id)}
  return this.render({force:true});
 }catch(e){ui.notifications.error(e.message)}}
 async close(options){apps.delete(this);return super.close(options)}
}
export class CalendarSummary extends CalendarApp{
 static DEFAULT_OPTIONS={classes:['d20age-sheet','d20age-calendar-summary'],position:{width:320,height:'auto',left:15,top:100},window:{title:'D20Age · Data atual',resizable:false}};
 async _renderHTML(){const c=calendarContext();return fragment(calendarSummaryView(c.state,c.definition,c.seconds,c.editable))}
}
let full,summary;
export const openCalendar=()=>{full??=new CalendarApp();apps.add(full);return full.render({force:true})};
export const openCalendarSummary=()=>{summary??=new CalendarSummary();apps.add(summary);return summary.render({force:true})};
export async function toggleCalendarSummary(){if(summary?.rendered){await summary.close();if(full?.rendered)await full.close();return}return openCalendarSummary()}
export function addCalendarControl(controls){const notes=controls.notes;if(!notes?.tools)return;notes.tools.d20ageCalendar={name:'d20ageCalendar',title:'D20Age · Abrir/fechar calendário',icon:'fa-solid fa-calendar-days',order:Math.max(-1,...Object.values(notes.tools).map(x=>Number(x.order)||0))+1,button:true,visible:true,onChange:toggleCalendarSummary}}
export function refreshCalendars(){for(const app of apps)if(app.rendered)app.render({force:true})}
export function registerCalendarHooks(){Hooks.on('getSceneControlButtons',addCalendarControl);Hooks.on('updateJournalEntry',(doc)=>{if(doc.getFlag('d20age','calendarRecord'))refreshCalendars()});Hooks.on('createJournalEntry',doc=>{if(doc.getFlag('d20age','calendarRecord'))refreshCalendars()});Hooks.on('updateWorldTime',refreshCalendars);Hooks.on('renderSettings',(app,element)=>{const root=element instanceof HTMLElement?element:element?.[0];if(!root||root.querySelector('[data-d20age-calendar]'))return;const b=document.createElement('button');b.type='button';b.dataset.d20ageCalendar='true';b.textContent='D20Age · Calendário';b.addEventListener('click',openCalendarSummary);root.append(b)});Hooks.once('ready',async()=>{try{await ensureCalendar();if(game.settings.get('d20age','showCalendarHUD'))await openCalendarSummary()}catch(e){ui.notifications.error('Calendário: '+e.message)}})}
