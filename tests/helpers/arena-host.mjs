export function qualifyArenaHost(html, sw, Params, clone) {
  const checks = [];
  function check(name, condition) { if (!condition) throw Error(name); checks.push(name); }
  function throws(fn) { try { fn(); return false; } catch { return true; } }
  const script = html.split('<script>')[1].split('</script>')[0];
  new Function(script); new Function(sw);
  check('arena and service worker JavaScript parse', true);
  const boot = '// ARENA_STARTUP_BOUNDARY';
  check('exact startup boundary', script.split(boot).length===2 && script.split(boot)[1].includes('else beginArena();'));
  function start(search) {
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    const elements = Object.fromEntries(ids.map(id => [id, {id, disabled:false, classList:{add(){},remove(){},toggle(){}}, addEventListener(){},getContext(){return {}},setAttribute(){}}]));
    const document = {getElementById(id){if(!elements[id])throw Error('Missing DOM id: '+id);return elements[id];},querySelectorAll(){return Object.values(elements).filter(e=>e.id.startsWith('sl-')||e.id.startsWith('surp-')||e.id.startsWith('fam-')||['btn-apply-rec','btn-auto-director','btn-auto-chaos','btn-respawn'].includes(e.id));}};
    const window={addEventListener(){}};
    const host=new Function('document','window','navigator','location','isSecureContext','URLSearchParams','structuredClone',script.split(boot)[0]+'\nreturn {buildEcosystem,seededRandom,experience,state,paused:()=>paused};')(document,window,{}, {search},false,Params,clone);
    return {...host,api:window.__ARENA_RPC__,elements};
  }
  function equalBytes(a,b){a=new Uint8Array(a);b=new Uint8Array(b);return a.length===b.length&&a.every((v,i)=>v===b[i]);}
  const def=start(''), small=start('?profile=smoke&mode=play&seed=42'), same=start('?profile=smoke&mode=play&seed=42'), different=start('?profile=smoke&mode=play&seed=43');
  for(const [name,host,founders,reserve,expectedNodes] of [['default',def,144,36,2117],['smoke',small,16,12,328]]){
    const e=host.buildEcosystem(), c=new Uint32Array(e.creatureBuf), n=new Uint32Array(e.nodeBuf), f=new Float32Array(e.nodeBuf), t=new Float32Array(e.templateBuf), tu=new Uint32Array(e.templateBuf);
    check(name+' expected population and node capacity', e.totalCreatures===founders+reserve&&e.activeNodes===expectedNodes&&e.activeNodes<=7200);
    check(name+' ABI byte lengths',e.creatureBuf.byteLength===512*32&&e.nodeBuf.byteLength===7200*48&&e.templateBuf.byteLength===e.activeNodes*48&&e.genomeBuf.byteLength===512*64&&e.brainBuf.byteLength===512*64);
    let cursor=0, valid=true;
    for(let cid=0;cid<e.totalCreatures;cid++){
      const o=cid*8, first=c[o+4], count=c[o+5], sp=c[o+1], alive=cid<founders;
      valid&&=first===cursor&&sp<6&&count===[10,13,14,14,9,12][sp]&&c[o]===(alive?1150:0);
      for(let i=first;i<first+count;i++){const j=i*12;valid&&=n[j+8]===cid&&n[j+9]===i-first&&f[j+3]===(alive?1:0)&&f[j+7]===(alive?sp:7)&&t[j+3]===1&&t[j+7]===sp&&tu[j+8]===cid&&[n[j+10],n[j+11]].every(x=>x===0xffffffff||(x>=first&&x<first+count))&&[f[j],f[j+1],f[j+2],t[j],t[j+1],t[j+2]].every(Number.isFinite);}
      valid&&=t[first*12]===0&&t[first*12+1]===0&&t[first*12+2]===0;cursor+=count;
    }
    check(name+' contiguous owned node ranges and dormant morphology templates',valid&&cursor===e.activeNodes);
    check(name+' initial flora grid',e.initialFlora.length===16384&&e.initialFlora.every(x=>x===650));
  }
  check('same seed same initial brain bytes',equalBytes(small.buildEcosystem().brainBuf,same.buildEcosystem().brainBuf));
  check('different seed changes initial brain bytes',!equalBytes(small.buildEcosystem().brainBuf,different.buildEcosystem().brainBuf));
  check('seeded random stream repeatable',Array.from({length:32},()=>small.seededRandom()).every(x=>x===same.seededRandom()));
  check('invalid seed falls back',start('?seed=4294967296').state.seed===1337&&start('?seed=-1').state.seed===1337);
  check('observe default denies intervention',def.experience.mode==='observe'&&throws(()=>def.api.setKnobs({ambientTemp:30}))&&throws(()=>def.api.triggerSurprise('meteor'))&&throws(()=>def.api.resetEcosystem()));
  check('observe disables intervention controls',def.elements['sl-temp'].disabled&&def.elements['fam-0'].disabled&&def.elements['surp-meteor'].disabled);
  check('play applies validated patches',small.api.setKnobs({ambientTemp:30,species:{0:{speed:0.7}}}).knobs.state.ambientTemp===30);
  check('patch validation is atomic',throws(()=>small.api.setKnobs({ambientTemp:31,seed:77}))&&small.state.ambientTemp===30&&small.state.seed===42);
  check('malformed patches rejected',[null,[],{gravityScale:NaN},{ambientTemp:46},{species:{6:{speed:1}}},{pillarCount:1.5}].every(p=>throws(()=>small.api.setKnobs(p))));
  check('snapshot detached from runtime',(()=>{const snap=small.api.getState();snap.knobs.state.seed=99;return small.state.seed===42;})());
  check('pause resume and strict boolean',(()=>{small.api.setPaused(true);const yes=small.paused();small.api.setPaused(false);return yes&&!small.paused()&&throws(()=>small.api.setPaused('yes'));})());
  check('unknown surprise rejected',throws(()=>small.api.triggerSurprise('unknown')));
  check('known surprise updates state',small.api.triggerSurprise('lowg').ok&&small.state.gravityScale===0.35);
  check('observe denies both strike APIs and disables targeting controls',throws(()=>def.api.armMeteor(0,0))&&throws(()=>def.api.lightning(0,0))&&def.elements['strike-place'].disabled&&def.elements['strike-lightning'].disabled);
  check('unstarted play cannot admit impacts',throws(()=>small.api.armMeteor(0,0))&&throws(()=>small.api.lightning(0,0)));
  return checks;
}
