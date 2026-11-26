(function(root){'use strict';
const D=86400000,M=60000, own='나';
const defaults=[['C10',300,840,'#d5efdb','#216b3c',true],['C16',480,1020,'#dceaff','#245caa',true],['C30',900,1440,'#fff0b5','#765800',true],['C32',960,1500,'#fff0b5','#765800',true],['OFF',null,null,'#ffdddd','#a82d35',false],['V',null,null,'#ffe4ca','#9a4b0a',false],['E',null,null,'#eadcff','#7242a5',true]].map(([code,start,end,bg,fg,work])=>({code,start,end,bg,fg,work,from:'1900-01-01'}));
const dayNum=s=>Date.parse(s+'T00:00:00Z')/D;
const dateKey=n=>new Date(n*D).toISOString().slice(0,10);
const validDay=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&Number.isFinite(dayNum(s))&&dateKey(dayNum(s))===s;
const addDay=(s,n)=>dateKey(dayNum(s)+n);
const today=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
const norm=s=>{const c=String(s||'').trim().toUpperCase();return c==='X'?'OFF':c==='AL'?'V':c;};
const minute=s=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s||'')?Number(s.slice(0,2))*60+Number(s.slice(3)):null;
const clock=n=>n==null?'':`${String(Math.floor(n/60)%24).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const dur=n=>`${Math.floor(n/60)}시간 ${n%60}분`;
const fresh=()=>({version:1,people:{[own]:{}},shifts:defaults.map(x=>({...x})),inactive:[],training:{},extras:[],notes:[],flights:[],revisions:[],holidays:[],leave:{},rules:{daily:480,weekly:2400,streak:5,rest:0,payroll:1},base:'TAE',lastBackup:null,zone:'UTC'});
function shift(s,c,d='9999-12-31'){const a=s.shifts.filter(x=>x.code===c&&x.from<=d).sort((a,b)=>b.from.localeCompare(a.from));return a[0]||((root.AIRPORTS||[]).some(x=>x.code===c)?{code:c,start:null,end:null,bg:'#fbdced',fg:'#9e386f',work:true}:null);}
function trainingEntry(s,d){return s.training?.[d]||null;}
function validTraining(x){return x&&typeof x.title==='string'&&x.title.trim().length>0&&x.title.length<=150&&((x.start===null&&x.end===null)||(Number.isInteger(x.start)&&x.start>=0&&x.start<1440&&Number.isInteger(x.end)&&x.end>x.start&&x.end-x.start<1440));}
function makeTraining(title,start,end){title=String(title||'').trim();const a=minute(start);let b=minute(end);if((start&&!end)||(!start&&end)||(start&&a===null)||(end&&b===null)||a!==null&&a===b)throw Error('교육 시작·종료 시간을 모두 입력하거나 모두 비워 주세요. 같은 시각은 입력할 수 없습니다.');if(b!==null&&b<a)b+=1440;const x={title,start:a,end:b};if(!validTraining(x))throw Error('교육명을 입력하세요 (최대 150자).');return x;}
function effectiveShift(s,p,d,r=s.people[p]||{}){const c=r[d],sh=shift(s,c,d);if(p!==own||c!=='E'||s.people[own][d]!=='E'||!sh)return sh;const x=trainingEntry(s,d);return validTraining(x)&&x.start!==null?{...sh,start:x.start,end:x.end}:sh;}
function interval(d,a,b){if(!validDay(d)||!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<=a||b>4320)return null;return [dayNum(d)*1440+a,dayNum(d)*1440+b];}
function spans(s,p,r=s.people[p]||{},extra=true){const list=[];for(const [d,c] of Object.entries(r)){const x=effectiveShift(s,p,d,r);if(x?.work){const i=interval(d,x.start,x.end);if(i)list.push(i);}}if(extra&&p===own)for(const x of s.extras){const i=interval(x.day,x.start,x.end);if(i)list.push(i);}return merge(list);}
function merge(list){const out=[];for(const i of list.slice().sort((a,b)=>a[0]-b[0])){const last=out.at(-1);if(last&&i[0]<=last[1])last[1]=Math.max(last[1],i[1]);else out.push(i.slice());}return out;}
function issues(s,p,r=s.people[p]||{}){const out=[],work=new Set(Object.keys(r).filter(d=>shift(s,r[d],d)?.work));if(p===own)for(const e of s.extras)work.add(e.day);let prev='',n=0;for(const d of [...new Set([...Object.keys(r),...work])].sort()){const a=r[addDay(d,-1)],b=r[d];if(['C30','C32'].includes(a)&&['C10','C16'].includes(b))out.push({day:d,level:'금지',msg:`${a} → ${b}`});if(work.has(d)){n=prev===addDay(d,-1)?n+1:1;prev=d;if(n>=s.rules.streak)out.push({day:d,level:n===s.rules.streak?'주의':'경고',msg:`${n}일 연속 근무`});}else{n=0;prev='';}}if(s.rules.rest>0){const a=spans(s,p,r);for(let i=1;i<a.length;i++){const gap=a[i][0]-a[i-1][1];if(gap<s.rules.rest)out.push({day:dateKey(Math.floor(a[i][0]/1440)),level:'주의',msg:`휴식 ${dur(gap)}`});}}return out;}
function assess(s,p,days){if(p===own||!s.people[p]||!days.length)return null;const a={...s.people[own]},b={...s.people[p]};for(const d of new Set(days)){if(!a[d]||!b[d])return null;[a[d],b[d]]=[b[d],a[d]];}const id=i=>i.day+i.level+i.msg, affected=new Set(days.flatMap(d=>[d,addDay(d,1)])), missing=[];const test=(person,r)=>{const old=new Set(issues(s,person).map(id));return issues(s,person,r).filter(i=>!old.has(id(i))||(i.level==='금지'&&affected.has(i.day)));};for(const d of days)for(let i=-(s.rules.streak-1);i<s.rules.streak;i++){const k=addDay(d,i);for(const [person,r] of [[own,a],[p,b]]){const sh=effectiveShift(s,person,k,r);if(!sh||(s.rules.rest>0&&sh.work&&sh.start==null))missing.push(person+' '+k);}}const mine=test(own,a),theirs=test(p,b),blocked=[...mine,...theirs].some(i=>i.level==='금지');return {a,b,mine,theirs,missing:[...new Set(missing)],blocked,status:blocked?'불가':missing.length?'확인 필요':mine.length||theirs.length?'주의':'가능'};}
function dayMinutes(list){const out=new Map();for(const [a,b] of list){for(let k=a;k<b;k++){const d=Math.floor(k/1440);if(!out.has(d))out.set(d,new Set());out.get(d).add(k-d*1440);}}return out;}
function report(s,from,to){const lo=dayNum(from),hi=dayNum(to),all=dayMinutes(spans(s,own)),base=dayMinutes(spans(s,own,s.people[own],false)),rows=[],tot={total:0,extra:0,night:0,holiday:0,holidayOver:0,overtime:0},unknown=[];let weekOrd=0;const start=lo-((lo+3)%7+7)%7;for(let d=start;d<hi;d++){if(((d+3)%7+7)%7===0)weekOrd=0;const key=dateKey(d),ms=[...(all.get(d)||[])].sort((a,b)=>a-b),holiday=s.holidays.includes(key),n=ms.length,regular=Math.min(n,s.rules.daily),dailyOver=Math.max(0,n-s.rules.daily),weeklyOver=Math.max(0,weekOrd+regular-s.rules.weekly)-Math.max(0,weekOrd-s.rules.weekly);weekOrd+=regular;if(d<lo)continue;const row={day:key,total:n,extra:n-(base.get(d)?.size||0),night:ms.filter(m=>m<360||m>=1320).length,holiday:holiday?n:0,holidayOver:holiday?Math.max(0,n-480):0,overtime:dailyOver+weeklyOver};rows.push(row);for(const k of Object.keys(tot))tot[k]+=row[k];const sh=effectiveShift(s,own,key);if(s.people[own][key]&&(!sh||sh.work&&sh.start==null))unknown.push(key);}
return {tot,rows,unknown};}
function period(month,start=1){const d=month+'-'+String(start).padStart(2,'0');const x=new Date(dayNum(d)*D);x.setUTCMonth(x.getUTCMonth()+1);return [d,x.toISOString().slice(0,10)];}
function fuel(order,add=[0,0,0]){if(![order,...add].every(x=>Number.isSafeInteger(x)&&x>=0&&x<=1e9)||add.length!==3)return null;const m=Math.min(order,7600),base=[Math.floor(m/2),Math.max(0,order-7600),Math.ceil(m/2)],final=base.map((n,i)=>n+add[i]);return {base,final,total:final.reduce((a,b)=>a+b,0),warn:final[0]>3800||final[2]>3800};}
function instant(s,z){if(!s)return null;const [d,t]=s.split('T');if(!validDay(d)||minute(t)==null)return null;return (dayNum(d)*1440+minute(t)-(z==='KST'?540:0))*M;}
function label(t,z){return t==null?'':new Date(t+(z==='KST'?9*3600000:0)).toISOString().slice(0,16);}
function block(a,b){return a==null||b==null||b<=a?null:Math.round((b-a)/M);}
function noteOn(n,d){if(d<n.day)return false;if(n.until&&d>n.until)return false;if(n.endDay&&d<=n.endDay)return true;const diff=dayNum(d)-dayNum(n.day);return d===n.day||n.repeat==='daily'||(n.repeat==='weekly'&&diff%7===0)||(n.repeat==='monthly'&&d.slice(8)===n.day.slice(8))||(n.repeat==='yearly'&&d.slice(5)===n.day.slice(5));}
function conflict(s,n,d,r=s.people[own]){if(n.time==null||!noteOn(n,d))return false;const t=dayNum(d)*1440+n.time;return spans(s,own,r).some(([a,b])=>a<=t&&t<b);}
function parseTable(text,month){const lines=text.trim().split(/\r?\n/).filter(x=>x.trim()),out=Object.create(null),max=new Date(Date.UTC(+month.slice(0,4),+month.slice(5),0)).getUTCDate();for(const l of lines){const a=l.includes('\t')?l.split('\t'):l.split(',');const p=a.shift().trim();if(!p||['__proto__','constructor','prototype'].includes(p)||a.length!==max)throw Error(`각 행은 이름과 ${max}일 근무 코드가 필요합니다: ${p}`);if(out[p])throw Error('이름 중복: '+p);out[p]=Object.create(null);a.forEach((c,i)=>{if(c.trim())out[p][`${month}-${String(i+1).padStart(2,'0')}`]=norm(c);});}if(!Object.keys(out).length)throw Error('등록할 자료 없음');return out;}
// Clear only the selected month's active roster and its own date-specific training details.
function planMonthClear(s,month,includeColleagues=false){
 if(typeof month!=='string'||!/^\d{4}-\d{2}$/.test(month)||!validDay(month+'-01'))throw Error('올바른 근무표 월을 선택하세요.');
 const inMonth=d=>validDay(d)&&d.slice(0,7)===month;
 const targets=includeColleagues===true?Object.keys(s.people):[own];
 const changes=[];
 for(const p of targets)for(const [d,c] of Object.entries(s.people[p]||{}))if(inMonth(d))changes.push({p,d,old:c,new:'—'});
 const trainingDays=Object.keys(s.training||{}).filter(inMonth);
 return {month,includeColleagues:includeColleagues===true,changes,trainingDays,ownCount:changes.filter(x=>x.p===own).length,colleagueCount:changes.filter(x=>x.p!==own).length};
}
function clearMonth(s,month,includeColleagues=false){
 const plan=planMonthClear(s,month,includeColleagues),people={...s.people};
 for(const p of new Set(plan.changes.map(x=>x.p)))people[p]={...people[p]};
 for(const {p,d} of plan.changes)delete people[p][d];
 const next={...s,people};
 if(s.training){next.training={...s.training};for(const d of plan.trainingDays)delete next.training[d];}
 return {next,plan};
}
const api={own,defaults,fresh,validDay,dayNum,dateKey,addDay,today,norm,minute,clock,dur,shift,trainingEntry,validTraining,makeTraining,effectiveShift,spans,issues,assess,report,period,fuel,instant,label,block,noteOn,conflict,parseTable,planMonthClear,clearMonth};if(typeof module!=='undefined')module.exports=api;else root.MR=api;
})(globalThis);
