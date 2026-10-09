export const COVER_VERSION='0.3.1';
export const COVER = 'systems/d20age/assets/cover.png?v=0.3.1';
export const THEME = 'systems/d20age/assets/mapas-de-pergaminho.mp3';
export function registerWelcome() {
 game.settings.register('d20age','welcomeCreated',{scope:'world',config:false,type:Boolean,default:false});
}
export async function createWelcome() {
 if(!game.user.isGM) return;
 const activeGM=game.users?.activeGM;
 if(activeGM && activeGM.id!==game.user.id) return;
 const coverScene=game.scenes.find(doc=>doc.getFlag('d20age','welcomeRole')==='cover');
 if(game.settings.get('d20age','welcomeCreated') && coverScene?.getFlag('d20age','coverVersion')===COVER_VERSION) return;
 const role=(doc,value)=>doc.getFlag('d20age','welcomeRole')===value;
 let playlist=game.playlists.find(doc=>role(doc,'theme'));
 if(!playlist) playlist=await Playlist.create({name:'D20Age · Música tema',mode:-1,flags:{d20age:{welcomeRole:'theme'}},sounds:[{name:'Mapas de Pergaminho',path:THEME,repeat:true,volume:0.4,playing:false,flags:{d20age:{welcomeRole:'theme-track'}}}]});
 let sound=playlist.sounds.find(doc=>role(doc,'theme-track'));
 if(!sound) [sound]=await playlist.createEmbeddedDocuments('PlaylistSound',[{name:'Mapas de Pergaminho',path:THEME,repeat:true,volume:0.4,playing:false,flags:{d20age:{welcomeRole:'theme-track'}}}]);
 let scene=game.scenes.find(doc=>role(doc,'cover'));
 const firstScene=game.scenes.size===0;
 if(!scene) scene=await Scene.create({name:'D20Age · Capa',background:{src:COVER},thumb:COVER,width:1100,height:1430,padding:0,grid:{type:0,size:100},backgroundColor:'#eee5d4',tokenVision:false,fog:{exploration:false},navigation:true,playlist:playlist.id,playlistSound:sound.id,flags:{d20age:{welcomeRole:'cover',coverVersion:COVER_VERSION}}});
 if(scene.getFlag('d20age','coverVersion')!==COVER_VERSION)await scene.update({'background.src':COVER,thumb:COVER,width:1100,height:1430,'flags.d20age.coverVersion':COVER_VERSION});
 if(firstScene) await scene.activate();
 await game.settings.set('d20age','welcomeCreated',true);
 return {scene,playlist,sound};
}
