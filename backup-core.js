(function(root){'use strict';
const DAYS=[7,14,30,60];
const defaults={enabled:true,days:30,newMonth:true,revision:false,include:false,snoozeUntil:null,skipMonth:null,fingerprint:null,scope:null};
function prefs(s){const p=s?.backupReminder||{};return {...defaults,...p,days:DAYS.includes(p.days)?p.days:30,enabled:p.enabled!==false,newMonth:p.newMonth!==false,revision:p.revision===true,include:p.include===true};}
function scoped(s,include){const x=JSON.parse(JSON.stringify(s));delete x.lastBackup;delete x.backupReminder;if(!include){x.people={'나':x.people['나']};x.revisions=[];}return x;}
// A change indicator, not a cryptographic integrity check.
function fingerprint(s,include){const text=JSON.stringify(scoped(s,include));let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return text.length+':'+(h>>>0).toString(16);}
function hasRecords(s){return Object.values(s.people||{}).some(r=>Object.keys(r).length)||['notes','extras','flights','revisions'].some(k=>s[k]?.length)||Object.keys(s.leave||{}).length;}
function dateKST(ms){return new Date(ms+9*3600000).toISOString().slice(0,10);}
function due(s,now=Date.now()){const p=prefs(s),day=dateKST(now),last=Date.parse(s.lastBackup||'');if(!p.enabled||!hasRecords(s)||p.skipMonth===day.slice(0,7)||p.snoozeUntil&&p.snoozeUntil>day)return null;const rs=s.revisions||[];const after=r=>!Number.isFinite(last)||Date.parse(r.saved)>last;const first=rs.find((r,i)=>after(r)&&!rs.slice(i+1).some(old=>old.month===r.month));if(p.newMonth&&first)return '새 근무표 등록 후 백업';if(p.revision&&rs.some(after))return '근무표 변경 후 백업';if(!Number.isFinite(last))return '첫 백업을 만들어 주세요';if(now-last>=p.days*86400000)return `${p.days}일 백업 주기 도래`;return null;}
function status(s){const p=prefs(s);if(!s.lastBackup)return '백업 기록 없음';if(p.fingerprint==null)return '이전 백업 이후 변경 여부 미확인';if(p.scope!==p.include)return '백업 범위가 변경됨';return p.fingerprint===fingerprint(s,p.include)?'선택한 범위의 변경 없음':'백업 이후 변경사항 있음';}
function prepare(s,now=Date.now()){const p=prefs(s),x=scoped(s,p.include),lastBackup=new Date(now).toISOString();const meta={...p,snoozeUntil:null,skipMonth:null,fingerprint:fingerprint(s,p.include),scope:p.include};x.lastBackup=lastBackup;x.backupReminder=meta;return {data:x,meta,lastBackup,name:'MyRoster_Backup_'+new Date(now+9*3600000).toISOString().slice(0,16).replace('T','_').replace(':','')+'.json'};}
const api={DAYS,prefs,scoped,fingerprint,hasRecords,dateKST,due,status,prepare};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MRBackup=api;
})(globalThis);
