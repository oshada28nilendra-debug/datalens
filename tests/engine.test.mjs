import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseCSV,profile,validate,validDate,numeric,createReport} from '../src/engine.js';
test('CSV preserves quoted commas, quotes, newlines, empty fields and BOM',()=>{
 assert.deepEqual(parseCSV('\uFEFFa,b,c\r\n"one,two","a""b","line\nnext"\r\nx,,\r\n'),{headers:['a','b','c'],rows:[['one,two','a"b','line\nnext'],['x','','']]});
});
test('Reject malformed CSV, duplicate headers, blank headers and ragged records',()=>{
 for(const s of ['', 'a,a\n1,2','a, \n1,2','a,b\n1','a\n"x','a\nx"y','a\n"x"z'])assert.throws(()=>parseCSV(s));
});
test('Header-only datasets and quoted empty records are well-defined',()=>{assert.deepEqual(parseCSV('a\n').rows,[]);assert.deepEqual(parseCSV('a\n""').rows,[['']]);});
test('Bound input size, rows and columns',()=>{
 assert.throws(()=>parseCSV('a'.repeat(5*1024*1024+1)),/5 MiB/);
 assert.throws(()=>parseCSV('a\n'+'x\n'.repeat(20001)),/20,000/);
 assert.throws(()=>parseCSV(Array.from({length:101},(_,i)=>'c'+i).join(',')),/100 columns/);
});
test('Numeric syntax rejects JS coercion traps and infinities',()=>{
 for(const v of ['0',' -1.2 ','1e3','.5','+2'])assert.equal(numeric(v),true,v);
 for(const v of ['',' ','0x10','Infinity','NaN','1,000','12px','1e999'])assert.equal(numeric(v),false,v);
});
test('Calendar dates handle leap years and reject normalized impossible dates',()=>{
 for(const v of ['2000-02-29','2024-02-29','0001-01-01','2026-12-31'])assert.equal(validDate(v),true,v);
 for(const v of ['1900-02-29','2026-02-29','2026-04-31','0000-01-01','2026-13-01','2026-1-01','2026-10-00'])assert.equal(validDate(v),false,v);
});
test('Profiling trims missing and distinct values without changing raw data',()=>{
 const d=parseCSV('n,date,text\n1,2026-01-01,A\n 1 ,2026-01-02, A \n , ,B');const p=profile(d);
 assert.deepEqual(p.map(c=>[c.type,c.missing,c.distinct]),[['Number',1,1],['ISO date',1,2],['Text',0,2]]);assert.equal(d.rows[1][0],' 1 ');
});
test('Unique flags all repeated records, is case-sensitive and excludes blanks',()=>{
 const d=parseCSV('id\nA\n A \na\n""\n" "');const r=validate(d,[{column:'id',kind:'unique'}]);
 assert.deepEqual(r.issues.map(i=>i.record),[2,3]);assert.equal(r.flaggedRecords,2);
});
test('Only required check flags missing cells; inclusive range rejects invalid numbers',()=>{
 const d=parseCSV('n\n""\n0\n10\n11\nabc');const rules=[{column:'n',kind:'range',min:0,max:10}];
 assert.deepEqual(validate(d,rules).issues.map(i=>i.record),[5,6]);
 assert.deepEqual(validate(d,[{column:'n',kind:'required'}]).issues.map(i=>i.record),[2]);
});
test('Invalid rule definitions are rejected',()=>{
 const d=parseCSV('a\n1');for(const r of [{column:'x',kind:'required'},{column:'a',kind:'wat'},{column:'a',kind:'range',min:2,max:1},{column:'a',kind:'range',min:'',max:3}])assert.throws(()=>validate(d,[r]));
});
test('Report preserves every issue, raw value, rules and source record',()=>{
 const d=parseCSV('a\n""\n""');const rules=[{column:'a',kind:'required'}];const r=createReport(d,rules,'a.csv');
 assert.equal(r.issues.length,2);assert.equal(r.flaggedRecords,2);assert.equal(r.issues[0].value,'');assert.equal(r.issues[0].record,2);rules[0].kind='date';assert.equal(r.rules[0].kind,'required');
});
test('Sample dataset produces expected issue count and affected records',async()=>{
 const d=parseCSV(await readFile(new URL('../samples/orders.csv',import.meta.url),'utf8'));
 const r=validate(d,[{column:'order_id',kind:'unique'},{column:'customer',kind:'required'},{column:'price',kind:'required'},{column:'price',kind:'range',min:0,max:1000},{column:'quantity',kind:'range',min:1,max:100},{column:'order_date',kind:'date'}]);
 assert.equal(r.issues.length,7);assert.equal(r.flaggedRecords,4);
});
