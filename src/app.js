import {parseCSV,profile,validate,createReport,LIMITS} from './engine.js';
const $=id=>document.getElementById(id);
let data=null,rules=[],filename='',page=0,loadVersion=0;
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
function error(message='') {$('error').textContent=message;$('error').hidden=!message;}
function load(text,name,sample=false) {
 const parsed=parseCSV(text);data=parsed;filename=name;page=0;$('flagged').checked=false;
 rules=sample?[{column:'order_id',kind:'unique'},{column:'customer',kind:'required'},{column:'price',kind:'required'},{column:'price',kind:'range',min:0,max:1000},{column:'quantity',kind:'range',min:1,max:100},{column:'order_date',kind:'date'}]:[];
 $('column').replaceChildren(...data.headers.map(h=>{const o=el('option',h);o.value=h;return o;}));
 $('workspace').hidden=false;error();render();$('status').textContent=`Loaded ${name}. ${data.rows.length} records. ${sample?'Sample checks applied.':'Add validation rules to inspect your data.'}`;
}
$('file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;const version=++loadVersion;try{if(file.size>LIMITS.bytes)throw Error('CSV exceeds the 5 MiB limit.');const text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());if(version===loadVersion)load(text,file.name);}catch(err){if(version===loadVersion)error(`File not loaded: ${err.message} Your previous dataset, if any, is unchanged.`);}finally{e.target.value='';}});
$('sample').onclick=async()=>{const version=++loadVersion;try{const res=await fetch('samples/orders.csv');if(!res.ok)throw Error('Could not load sample.');const text=await res.text();if(version===loadVersion)load(text,'sample-orders.csv',true);}catch(err){if(version===loadVersion)error(err.message);}};
$('kind').onchange=()=>{const range=$('kind').value==='range';$('min-wrap').hidden=!range;$('max-wrap').hidden=!range;$('min').required=range;$('max').required=range;};
$('rule-form').onsubmit=e=>{e.preventDefault();if(!data)return;const rule={column:$('column').value,kind:$('kind').value};if(rule.kind==='range'){rule.min=$('min').value;rule.max=$('max').value;}
try {validate(data,[rule]);if(rule.kind==='range'){rule.min=Number(rule.min);rule.max=Number(rule.max);}if(rules.some(r=>JSON.stringify(r)===JSON.stringify(rule)))throw Error('This check is already present.');rules.push(rule);page=0;error();render();$('status').textContent='Check added. Findings updated.';}catch(err){error(err.message);}};
$('flagged').onchange=()=>{page=0;render();};$('prev').onclick=()=>{page--;render();};$('next').onclick=()=>{page++;render();};
$('export').onclick=()=>{if(!data)return;const blob=new Blob([JSON.stringify(createReport(data,rules,filename),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=el('a');a.href=url;a.download='datalens-quality-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('status').textContent='Report downloaded. It includes source values from flagged records; review before sharing.';};
function render(){
 const profiles=profile(data),result=validate(data,rules),flagged=new Set(result.issues.map(i=>i.record));
 $('filename').textContent=filename;
 const missing=profiles.reduce((s,c)=>s+c.missing,0);
 $('stats').replaceChildren(...[[data.rows.length,'Records'],[data.headers.length,'Columns'],[missing,'Missing cells'],[rules.length?result.flaggedRecords:'—','Flagged records']].map(([v,label])=>{const card=el('div',undefined,'stat');card.append(el('span',label),el('strong',String(v)));return card;}));
 $('profiles').replaceChildren(...profiles.map(c=>{const tr=el('tr');[c.name,c.type,c.missing,c.distinct].forEach(v=>tr.append(el('td',String(v))));const td=el('td');const percent=data.rows.length?Math.round(100*(1-c.missing/data.rows.length)):null;const meter=el('div',undefined,'meter');const fill=el('span');fill.style.width=(percent??0)+'%';meter.append(fill);td.append(el('span',percent===null?'No records':percent+'%'),meter);tr.append(td);return tr;}));
 $('rules').replaceChildren(...rules.map((r,i)=>{const chip=el('div',undefined,'rule');chip.append(el('span',`${r.column} · ${r.kind}${r.kind==='range'?` [${r.min}, ${r.max}]`:''}`));const button=el('button','×');button.setAttribute('aria-label',`Remove ${r.kind} check for ${r.column}`);button.onclick=()=>{rules.splice(i,1);page=0;render();$('status').textContent='Check removed. Findings updated.';};chip.append(button);return chip;}));if(!rules.length)$('rules').append(el('p','No checks yet. Add a rule to begin validation.','hint'));
 const selected=data.rows.map((r,i)=>({r,record:i+2})).filter(x=>!$('flagged').checked||flagged.has(x.record));
 const pages=Math.max(1,Math.ceil(selected.length/50));page=Math.max(0,Math.min(page,pages-1));
 const head=el('thead'),hr=el('tr');['Record',...data.headers].forEach(h=>hr.append(el('th',h)));head.append(hr);const body=el('tbody');
 for(const {r,record} of selected.slice(page*50,page*50+50)){const tr=el('tr');if(flagged.has(record))tr.className='flagged';tr.append(el('td',String(record)));r.forEach(v=>tr.append(el('td',v===''?'—':v)));body.append(tr);}
 if(!selected.length){const tr=el('tr'),td=el('td','No records to display.');td.colSpan=data.headers.length+1;tr.append(td);body.append(tr);}
 $('preview').replaceChildren(head,body);$('prev').disabled=page===0;$('next').disabled=page>=pages-1;$('page-label').textContent=`Page ${page+1} of ${pages} · ${selected.length} records`;
 $('finding-count').textContent=`${result.issues.length} findings across ${result.flaggedRecords} records`;
 $('findings').replaceChildren(...result.issues.slice(0,200).map(i=>{const div=el('div',undefined,'finding');div.append(el('span',`RECORD ${i.record}`,'record-tag'),el('strong',i.column),el('span',i.message));return div;}));
 if(!result.issues.length)$('findings').append(el('p',rules.length?'No issues found by the configured checks. Review the data before relying on it.':'Add checks to see findings.','empty'));
}
