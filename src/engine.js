export const LIMITS = {bytes: 5 * 1024 * 1024, rows: 20000, columns: 100};
export function parseCSV(input) {
  const text = input.replace(/^\uFEFF/, '');
  if (new TextEncoder().encode(text).length > LIMITS.bytes) throw new Error('CSV exceeds the 5 MiB limit.');
  const records = []; let row = [], field = '', quoted = false, closed = false;
  const pushField = () => {row.push(field); field = ''; closed = false; if (row.length > LIMITS.columns) throw new Error('CSV exceeds 100 columns.');};
  const pushRow = () => {pushField(); records.push(row); row = []; if (records.length > LIMITS.rows + 1) throw new Error('CSV exceeds 20,000 data rows.');};
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {if (text[i+1] === '"') {field += '"'; i++;} else {quoted = false; closed = true;}}
      else field += c;
    } else if (c === ',') pushField();
    else if (c === '\n' || c === '\r') {if (c === '\r' && text[i+1] === '\n') i++; pushRow();}
    else if (c === '"' && field === '' && !closed) quoted = true;
    else {if (closed || c === '"') throw new Error('Malformed CSV: unexpected character around a quoted field.'); field += c;}
  }
  if (quoted) throw new Error('Malformed CSV: unterminated quoted field.');
  if (row.length || field || closed) pushRow();
  if (!records.length) throw new Error('CSV is empty.');
  const headers = records.shift().map(v => v.trim());
  if (headers.some(v => !v)) throw new Error('Each column needs a non-empty header.');
  if (new Set(headers).size !== headers.length) throw new Error('Column headers must be unique after trimming.');
  records.forEach((r,i) => {if (r.length !== headers.length) throw new Error(`Record ${i+2} has ${r.length} fields; expected ${headers.length}.`);});
  return {headers, rows: records};
}
export const missing = value => value.trim() === '';
export function numeric(value) {
  const s = value.trim();
  return /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s) && Number.isFinite(Number(s));
}
export function validDate(value) {
  const s = value.trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y,m,d] = s.split('-').map(Number);
  if (y < 1 || m < 1 || m > 12 || d < 1) return false;
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  return d <= [31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1];
}
export function profile(data) {
  return data.headers.map((name,c) => {
    const values = data.rows.map(r => r[c]).filter(v => !missing(v));
    const type = !values.length ? 'Empty' : values.every(numeric) ? 'Number' : values.every(validDate) ? 'ISO date' : 'Text';
    return {name, type, missing: data.rows.length-values.length, distinct: new Set(values.map(v=>v.trim())).size};
  });
}
export function validate(data, rules) {
  const issues = [];
  for (const rule of rules) {
    const c = data.headers.indexOf(rule.column);
    if (c < 0) throw new Error(`Unknown column: ${rule.column}`);
    if (!['required','unique','range','date'].includes(rule.kind)) throw new Error('Unknown validation rule.');
    if (rule.kind === 'range' && (!numeric(String(rule.min)) || !numeric(String(rule.max)) || Number(rule.min)>Number(rule.max))) throw new Error('Range requires finite numeric bounds with minimum ≤ maximum.');
    const groups = new Map();
    if (rule.kind === 'unique') data.rows.forEach((r,i)=> {const v=r[c].trim();if(v) {if(!groups.has(v)) groups.set(v,[]);groups.get(v).push(i);}});
    data.rows.forEach((r,i) => {
      const v = r[c]; let message = '';
      if (rule.kind === 'required' && missing(v)) message = 'Required value is missing.';
      if (!missing(v)) {
        if (rule.kind === 'unique' && groups.get(v.trim()).length > 1) message = `Repeated value (${groups.get(v.trim()).length} records).`;
        if (rule.kind === 'date' && !validDate(v)) message = 'Expected a real calendar date in YYYY-MM-DD format.';
        if (rule.kind === 'range' && (!numeric(v) || Number(v)<Number(rule.min) || Number(v)>Number(rule.max))) message = `Expected a number from ${rule.min} to ${rule.max}, inclusive.`;
      }
      if (message) issues.push({record:i+2,column:rule.column,kind:rule.kind,value:v,message});
    });
  }
  return {issues, flaggedRecords: new Set(issues.map(i=>i.record)).size};
}
export function createReport(data, rules, filename) {
  return {schemaVersion:1, filename, generatedAt:new Date().toISOString(), rowCount:data.rows.length, columnCount:data.headers.length, profiles:profile(data), rules:structuredClone(rules), ...validate(data,rules), note:'Flags require human review. Passing configured checks does not establish correctness. Record numbers count the header as record 1, not physical lines.'};
}
