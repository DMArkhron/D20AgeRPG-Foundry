export function brandPause(app,element){
  const root=(element?.querySelector?element:element?.[0])??app?.element;
  if(!root)return;
  const img=root.querySelector('img');
  if(!img)return;
  root.classList.add('d20age-pause');
  img.src='systems/d20age/assets/logo.png';
  img.alt='D20Age RPG';
}
export function registerPauseBranding(){
  Hooks.on('renderGamePause',brandPause);
  Hooks.on('renderPause',brandPause);
  Hooks.once('ready',()=>brandPause(ui.pause,ui.pause?.element));
}
