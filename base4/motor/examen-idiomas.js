window.LabI18n={
 language:'es',bundles:{},
 async init({activity,folder,sections,read}){
  this.activity=activity;this.sections=sections;
  for(const lang of ['es','en']){
   const bundle=await read(folder+activity.idiomas[lang]).then(r=>r.json());
   if(!bundle.rubric&&bundle.rubricFile){
    if(!/^rubrica(?:-[a-z]{2})?\.json$/.test(bundle.rubricFile))throw Error('Invalid rubric path.');
    bundle.rubric=await read(folder+bundle.rubricFile).then(r=>r.json());
   }
   this.bundles[lang]=bundle;
  }
  let lang=new URLSearchParams(location.search).get('lang');
  if(!['es','en'].includes(lang)){try{lang=localStorage.getItem('base4-ui-language');}catch{}}
  return this.apply(lang==='en'?'en':'es');
 },
 apply(lang){
  const bundle=this.bundles[lang];if(!bundle)throw Error('Translation unavailable.');
  for(const section of this.sections){
   const translated=bundle.sections.find(s=>s.id===section.id);if(!translated)throw Error('Incomplete translation.');
   if(section.type!=='webcode'){
    const questions=window.LabSections.questions(translated.questions,section.type);
    if(questions.length!==section.questions.length||questions.some(q=>!section.questions.some(old=>old.id===q.id)))throw Error('Question ids do not match.');
    section.questions=questions;
   }
   section.title=translated.title;section.statement=translated.statement;section.points=translated.points;
  }
  this.language=lang;this.activity.title=bundle.title;document.documentElement.lang=lang;
  const url=new URL(location.href);url.searchParams.set('lang',lang);history.replaceState(null,'',url);
  try{localStorage.setItem('base4-ui-language',lang);}catch{}
  return bundle;
 },
 message(value){
  if(this.language!=='en')return value;
  return this.bundles.en.messages?.[value]||value;
 }
};
