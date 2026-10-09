export async function openPortrait(actor) {
 const viewer=new foundry.applications.apps.ImagePopout({src:actor.img || "systems/d20age/assets/crest.svg",uuid:actor.uuid,window:{title:actor.name}});
 await viewer.render({force:true});
 return viewer;
}
export async function choosePortrait(sheet) {
 if (!sheet.isEditable || !sheet.actor.isOwner) return;
 const FilePicker=foundry.applications.apps.FilePicker.implementation;
 const picker=new FilePicker({type:"image",current:sheet.actor.img,window:{title:"Trocar retrato"},callback:async path=>{
  if (!path || !sheet.isEditable || !sheet.actor.isOwner) return;
  await sheet.actor.update({img:path});
 }});
 await picker.render({force:true});
 return picker;
}
