import {mountWorkspace} from './workspace.mjs';
const ids=['rings','radar','gallery','inspector'],labels=['Reality Rings','Intent Radar','Gallery','Critic Inspector'];
const ui=mountWorkspace({root:document.querySelector('#panels'),controls:document.querySelector('#settings'),panes:ids.map((id,i)=>({id,label:labels[i],element:document.querySelector('#'+id+'-content')})),key:'evoforge-workspace-demo-v1'});
for(const b of document.querySelectorAll('[data-candidate]')){b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>{const id=b.dataset.candidate;document.querySelector('#selection').textContent='Selected candidate: '+id;for(const x of document.querySelectorAll('[data-candidate]'))x.setAttribute('aria-pressed',String(x.dataset.candidate===id))})}
