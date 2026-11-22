(()=>{
const $=id=>document.getElementById(id),today=()=>new Date().toISOString().slice(0,10),num=v=>Math.max(0,Number(v)||0),money=v=>'৳'+Number(v||0).toLocaleString('en-BD',{maximumFractionDigits:2}),uid=p=>p+'-'+Date.now().toString(36).toUpperCase();
let db=load();function load(){try{return Object.assign({customers:[],money:[],works:[]},JSON.parse(localStorage.getItem('iem-db')||'{}'))}catch{return {customers:[],money:[],works:[]}}}
function save(){localStorage.setItem('iem-db',JSON.stringify(db));render()}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function days(a,b){return Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000)}
function status(w){return ['Finished','Returned'].includes(w.status)?w.status:(w.deadline<today()?'Due':w.status)}
function reminders(){let out=[];db.works.forEach(w=>{if(['Finished','Returned'].includes(w.status))return;let d=days(today(),w.deadline);if(d===7)out.push({w,msg:'Deadline in 7 days',date:w.deadline});if(d===0)out.push({w,msg:'Deadline is today',date:w.deadline});if(d<0)out.push({w,msg:'Overdue by '+(-d)+' day(s)',date:w.deadline})});return out.sort((a,b)=>a.date.localeCompare(b.date))}
function item(title,sub,actions){return '<div class="item"><div><strong>'+title+'</strong><div class="meta">'+sub+'</div></div><div class="actions">'+actions+'</div></div>'}
function act(type,id,label,cls='secondary'){return '<button class="btn small '+cls+'" data-action="'+type+'" data-id="'+esc(id)+'">'+label+'</button>'}
function render(){
let inc=db.money.filter(x=>x.type==='Income').reduce((a,x)=>a+x.amount,0),out=db.money.filter(x=>x.type==='Expense').reduce((a,x)=>a+x.amount,0);
$('totalIncome').textContent=money(inc);$('totalExpense').textContent=money(out);$('balance').textContent=money(inc-out);
$('pendingCount').textContent=db.works.filter(w=>status(w)==='Pending').length;$('dueCount').textContent=db.works.filter(w=>status(w)==='Due').length;$('finishedCount').textContent=db.works.filter(w=>status(w)==='Finished').length;
let now=new Date(),week=new Date(now);week.setDate(now.getDate()-6);let month=now.toISOString().slice(0,7);
const sum=(type,fn)=>db.money.filter(x=>x.type===type&&fn(x)).reduce((a,x)=>a+x.amount,0);
$('periodSummary').innerHTML='<p>Last 7 days — Income: <b>'+money(sum('Income',x=>x.date>=week.toISOString().slice(0,10)))+'</b> · Expense: <b>'+money(sum('Expense',x=>x.date>=week.toISOString().slice(0,10)))+'</b></p><p>This month — Income: <b>'+money(sum('Income',x=>x.date.startsWith(month)))+'</b> · Expense: <b>'+money(sum('Expense',x=>x.date.startsWith(month)))+'</b></p>';
let rem=reminders();$('homeReminders').innerHTML=rem.length?rem.slice(0,5).map(r=>'<div class="item"><div><strong>'+esc(r.w.customer)+'</strong><div class="meta">'+esc(r.msg)+' · '+esc(r.w.id)+'</div></div></div>').join(''):'<div class="empty">No upcoming or overdue reminders.</div>';
let q=($('customerSearch').value||'').toLowerCase();let cs=db.customers.filter(c=>(c.name+' '+c.mobile).toLowerCase().includes(q));
$('customerList').innerHTML=cs.length?cs.map(c=>item(esc(c.name)+' · '+esc(c.mobile),'Contact '+money(c.amount)+' · Net payment '+money(c.net)+' · Delivery '+(c.delivery||'—'),act('cedit',c.mobile,'Edit')+act('cdel',c.mobile,'Delete','danger'))).join(''):'<div class="empty">No customer records yet.</div>';
let mf=$('moneyFilter').value;let ms=db.money.filter(x=>mf==='All'||x.type===mf).slice().reverse();
$('moneyList').innerHTML=ms.length?ms.map(x=>item('<span class="'+(x.type==='Income'?'good':'bad')+'">'+esc(x.type)+'</span> · '+money(x.amount),esc(x.category)+' · '+esc(x.date)+' · '+esc(x.description),act('medit',x.id,'Edit')+act('mdel',x.id,'Delete','danger'))).join(''):'<div class="empty">No transactions yet.</div>';
$('workList').innerHTML=db.works.slice().reverse().map(w=>item(esc(w.customer)+' · '+esc(w.id),esc(w.description)+' · Deadline '+esc(w.deadline)+' · <b>'+esc(status(w))+'</b>',act('wedit',w.id,'Edit')+act('wdel',w.id,'Delete','danger'))).join('')||'<div class="empty">No work records yet.</div>';
$('reminderList').innerHTML=rem.length?rem.map(r=>item(esc(r.w.customer)+' · '+esc(r.w.id),esc(r.msg)+' · Deadline '+esc(r.date),act('wedit',r.w.id,'Open work'))).join(''):'<div class="empty">No upcoming or overdue reminders.</div>';
}
function clearForm(form,hidden){form.reset();$(hidden).value=''}
$('cPay1').oninput=$('cPay2').oninput=$('cPay3').oninput=$('cAmount').oninput=()=>{$('cNet').value=(num($('cAmount').value)-num($('cPay1').value)-num($('cPay2').value)-num($('cPay3').value)).toFixed(2)};
$('customerForm').onsubmit=e=>{e.preventDefault();let mobile=$('cMobile').value.trim();if(!mobile)return;let old=db.customers.find(x=>x.mobile===mobile),c={mobile,name:$('cName').value,contact:$('cContact').value,amount:num($('cAmount').value),p1:num($('cPay1').value),p2:num($('cPay2').value),p3:num($('cPay3').value),net:num($('cAmount').value)-num($('cPay1').value)-num($('cPay2').value)-num($('cPay3').value),taken:$('cTaken').value,delivery:$('cDelivery').value};if(old&&$('customerEdit').value!==mobile&&!confirm('This mobile number already exists. Update it?'))return;if(old)Object.assign(old,c);else db.customers.push(c);clearForm($('customerForm'),'customerEdit');$('cNet').value='0';save()};
$('customerClear').onclick=()=>{clearForm($('customerForm'),'customerEdit');$('cNet').value='0'};
$('moneyForm').onsubmit=e=>{e.preventDefault();let x={id:$('moneyEdit').value||uid('TX'),type:$('mType').value,category:$('mCategory').value,amount:num($('mAmount').value),date:$('mDate').value,description:$('mDescription').value};let i=db.money.findIndex(y=>y.id===x.id);if(i<0)db.money.push(x);else db.money[i]=x;clearForm($('moneyForm'),'moneyEdit');$('mDate').value=today();save()};
$('moneyClear').onclick=()=>clearForm($('moneyForm'),'moneyEdit');
$('workForm').onsubmit=e=>{e.preventDefault();let id=$('workEdit').value||uid('WORK'),w={id,customer:$('wCustomer').value,contact:$('wContact').value,description:$('wDescription').value,received:$('wReceived').value,deadline:$('wDeadline').value,completed:$('wCompleted').value,status:$('wStatus').value};let i=db.works.findIndex(x=>x.id===id);if(i<0)db.works.push(w);else db.works[i]=w;clearForm($('workForm'),'workEdit');$('wId').value='';save()};
$('workClear').onclick=()=>{clearForm($('workForm'),'workEdit');$('wId').value=''};
document.addEventListener('click',e=>{let b=e.target.closest('[data-action]');if(!b)return;let {action,id}=b.dataset;
if(action==='cdel'&&confirm('Delete this customer?'))db.customers=db.customers.filter(x=>x.mobile!==id);
if(action==='mdel'&&confirm('Delete this transaction?'))db.money=db.money.filter(x=>x.id!==id);
if(action==='wdel'&&confirm('Delete this work record?'))db.works=db.works.filter(x=>x.id!==id);
if(action==='cedit'){let c=db.customers.find(x=>x.mobile===id);$('customerEdit').value=c.mobile;[['cMobile','mobile'],['cName','name'],['cContact','contact'],['cAmount','amount'],['cPay1','p1'],['cPay2','p2'],['cPay3','p3'],['cTaken','taken'],['cDelivery','delivery']].forEach(([a,k])=>$(a).value=c[k]??'');$('cNet').value=c.net}
if(action==='medit'){let x=db.money.find(x=>x.id===id);$('moneyEdit').value=id;[['mType','type'],['mCategory','category'],['mAmount','amount'],['mDate','date'],['mDescription','description']].forEach(([a,k])=>$(a).value=x[k])}
if(action==='wedit'){let w=db.works.find(x=>x.id===id);$('workEdit').value=id;$('wId').value=id;[['wCustomer','customer'],['wContact','contact'],['wDescription','description'],['wReceived','received'],['wDeadline','deadline'],['wCompleted','completed'],['wStatus','status']].forEach(([a,k])=>$(a).value=w[k]||'');document.querySelector('[data-tab="work"]').click()}
save()});
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x.id===b.dataset.tab))});
$('customerSearch').oninput=render;$('moneyFilter').onchange=render;$('themeBtn').onclick=()=>{document.documentElement.classList.toggle('dark');localStorage.setItem('iem-dark',document.documentElement.classList.contains('dark')?'1':'0')};if(localStorage.getItem('iem-dark')==='1')document.documentElement.classList.add('dark');
$('exportBtn').onclick=()=>{let a=document.createElement('a'),blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});a.href=URL.createObjectURL(blob);a.download='income-expense-backup-'+today()+'.json';a.click();URL.revokeObjectURL(a.href)};
$('importFile').onchange=async e=>{try{let x=JSON.parse(await e.target.files[0].text());if(!Array.isArray(x.customers)||!Array.isArray(x.money)||!Array.isArray(x.works))throw Error();if(confirm('Replace current records with this backup?')){db=x;save();alert('Backup restored.')}}catch{alert('Invalid backup file.')}e.target.value=''};
$('clearAll').onclick=()=>{if(confirm('Permanently delete all records stored in this browser?')){db={customers:[],money:[],works:[]};save()}};
$('notifyBtn').onclick=async()=>{if(!('Notification'in window)){alert('Notifications are not supported by this browser.');return}let p=await Notification.requestPermission();alert(p==='granted'?'Browser notifications enabled. Open the app to review reminders.':'Notification permission was not granted.')};
$('mDate').value=$('wReceived').value=$('cTaken').value=today();render();
})();