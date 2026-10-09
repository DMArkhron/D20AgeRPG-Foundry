export const ALIGNMENTS={'':'Não definido',Ordem:'Ordem',Neutralidade:'Neutralidade',Caos:'Caos'};
export const LANGUAGE_TABLE=['Abissal','Alinhamento','Anão','Celestial','Cobolde','Dracônico','Duende','Élfico','Ente','Feérico','Gárgula','Gigante','Gnomo','Harpia','Infernal','Malandrino','Mímico','Nereída','Orque','Silvano'];
export function defaultLanguages(classId){return ['Comum',...({dwarf:['Anão'],elf:['Élfico'],gnome:['Gnomo']}[classId]??[])];}
export function alignmentOptions(value){return {...ALIGNMENTS,...(value&&!Object.hasOwn(ALIGNMENTS,value)?{[value]:value}: {})};}
export function languageLabel(name,alignment){return name==='Alinhamento'&&alignment?`Alinhamento (${alignment})`:name;}
