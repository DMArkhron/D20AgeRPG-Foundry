import {escapeHTML as e} from './view.mjs';
export const TOKEN_DEFAULTS={enabled:false,lockRotation:false,displayBars:30,displayName:20,hpBar:true};
export const DISPLAY_MODES={0:'Nunca',10:'Ao controlar o token',20:'Ao passar o mouse · proprietário',30:'Ao passar o mouse · todos',40:'Sempre · proprietário',50:'Sempre · todos'};
export function tokenPreferences(){return {...TOKEN_DEFAULTS,...game.settings.get('d20age','tokenDefaults')}}
export function validateTokenPreferences(data){
 const p={enabled:!!data.enabled,lockRotation:!!data.lockRotation,hpBar:!!data.hpBar,displayBars:Number(data.displayBars),displayName:Number(data.displayName)};
 if(!Object.hasOwn(DISPLAY_MODES,p.displayBars)||!Object.hasOwn(DISPLAY_MODES,p.displayName))throw Error('Visibilidade de token inválida.');return p;
}
export function tokenChanges(p){return {lockRotation:p.lockRotation,displayBars:p.displayBars,displayName:p.displayName,'bar1.attribute':p.hpBar?'hp':null}}
export async function applySelectedTokenPreferences(p){
 if(!game.user.isGM)throw Error('Somente o mestre altera os padrões da mesa.');
 const tokens=(globalThis.canvas?.tokens?.controlled??[]).filter(t=>['character','creature'].includes(t.document.actor?.type));
 if(!tokens.length)throw Error('Selecione tokens de personagens ou criaturas no mapa.');
 await canvas.scene.updateEmbeddedDocuments('Token',tokens.map(t=>({_id:t.document.id,...tokenChanges(validateTokenPreferences(p))})));
 return tokens.length;
}
export function registerTokenPreferences(){
 game.settings.register('d20age','tokenDefaults',{scope:'world',config:false,type:Object,default:TOKEN_DEFAULTS});
 Hooks.on('preCreateToken',(doc,data,options,userId)=>{
  if(userId!==game.user.id||!['character','creature'].includes(doc.actor?.type))return;
  const p=tokenPreferences();if(p.enabled)doc.updateSource(tokenChanges(p));
 });
}
// Use the settings actually registered by this Foundry build, including its choices and scope.
export function nativeRulerSettings(){return Array.from(game.settings.settings?.values?.()??[]).filter(s=>s.namespace==='core'&&/ruler|diagonal|autorotate/i.test(s.key)&&s.config!==false&&(s.type===Boolean||s.choices))}
const select=(label,name,value,choices)=>`<label class="field"><span>${e(label)}</span><select name="${e(name)}">${Object.entries(choices).map(([k,v])=>`<option value="${e(k)}" ${String(value)===k?'selected':''}>${e(v)}</option>`).join('')}</select></label>`;
const check=(label,name,value)=>`<label class="check"><input type="checkbox" name="${e(name)}" ${value?'checked':''}> ${e(label)}</label>`;
const card=(title,body)=>`<section class="adjust-card"><h3>${title}</h3>${body}</section>`;
export function tokenConfigMarkup(){const p=tokenPreferences();return card('Padrões para novos tokens',check('Usar estes padrões ao colocar tokens no mapa','enabled',p.enabled)+'<p class="hint">Quando desativado, cada token utiliza a configuração de sua ficha. Quando ativado, os controles abaixo são aplicados aos novos tokens de personagens e criaturas.</p>')+card('Orientação e identificação',check('Travar a rotação da ilustração','lockRotation',p.lockRotation)+'<p class="hint">Mantém a arte na mesma orientação visual.</p>'+select('Quando mostrar o nome','displayName',p.displayName,DISPLAY_MODES))+card('Barra de pontos de vida',check('Usar os pontos de vida na primeira barra','hpBar',p.hpBar)+select('Quando mostrar as barras','displayBars',p.displayBars,DISPLAY_MODES)+'<p class="hint">A visibilidade se aplica às barras do token. “Proprietário” respeita as permissões da ficha. O mestre mantém seu acesso de administração.</p>')+card('Tokens que já estão no mapa','<p class="hint">Salvar os padrões não altera tokens existentes. Selecione os tokens desejados no mapa e use o botão abaixo para aplicar os valores deste formulário.</p><button type="button" data-action="apply-tokens">Aplicar aos tokens selecionados</button>')}
export function rulerConfigMarkup(){return card('Régua nativa do Foundry',nativeRulerSettings().map(s=>{const value=game.settings.get('core',s.key),name='native.'+s.key,label=game.i18n.localize(s.name);const choices=typeof s.choices==='function'?s.choices():s.choices;return (s.type===Boolean?check(label,name,value):select(label,name,value,Object.fromEntries(Object.entries(choices).map(([k,v])=>[k,game.i18n.localize(v)]))))+`<p class="hint">${e(game.i18n.localize(s.hint??''))} · ${s.scope==='world'?'Toda a mesa':'Este usuário'}</p>`}).join('')||'<p class="hint">Este Foundry não expõe opções de régua compatíveis neste painel. Use as configurações nativas do jogo.</p>')+card('Escala e unidades','<p class="hint">A régua usa a escala da grade da cena. Abra Medidas para escolher pés ou metros e converter a cena atual. Peso e volume também podem ser configurados.</p><button type="button" data-action="measures">Configurar medidas e carga</button><button type="button" data-action="scene-config">Abrir configuração da cena</button>')}
export async function saveNativeRulerSettings(form){
 if(!game.user.isGM)throw Error('Somente o mestre configura a mesa.');
 const changes=nativeRulerSettings().map(s=>{let value=s.type===Boolean?form.has('native.'+s.key):form.get('native.'+s.key);if(s.type!==Boolean){const choices=typeof s.choices==='function'?s.choices():s.choices;if(!Object.hasOwn(choices,value))throw Error('Opção de régua inválida.');if(s.type===Number)value=Number(value)}return [s.key,value]});
 for(const [key,value]of changes)if(game.settings.get('core',key)!==value)await game.settings.set('core',key,value);
}
