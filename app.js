(()=>{
const $=id=>document.getElementById(id);
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const num=v=>Math.max(0,Number(v)||0),money=v=>'৳'+Number(v||0).toLocaleString('en-BD',{maximumFractionDigits:2}),uid=p=>p+'-'+Date.now().toString(36).toUpperCase();
const digits=v=>String(v||'').replace(/\D/g,'').slice(0,11);
const formatMobile=v=>{let d=digits(v);return d.length>5?d.slice(0,5)+'-'+d.slice(5):d};
const validMobile=v=>/^01\d{9}$/.test(digits(v));
let db=load();
function load(){
 try{
  const x=JSON.parse(localStorage.getItem('iem-db')||'{}');
  const data=Object.assign({customers:[],money:[],works:[]},x);
  data.customers=data.customers.map(c=>({...c,mobile:formatMobile(c.mobile)}));
  data.works=data.works.map(w=>{
   if(!/^01\d{9}$/.test(digits(w.id))){
    const c=data.customers.find(c=>c.name===w.customer);
    if(c)w={...w,id:digits(c.mobile)};
   }
   return w;
  });
  return data;
 }catch{return {customers:[],money:[],works:[]}}
}
function save(){localStorage.setItem('iem-db',JSON.stringify(db));render()}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function days(a,b){return Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000)}
function status(w){return ['Finished','Returned'].includes(w.status)?w.status:(w.deadline<today()?'Due':w.status)}
function reminders(){let out=[];db.works.forEach(w=>{if(['Finished','Returned'].includes(w.status))return;let d=days(today(),w.deadline);if(d===7)out.push({w,msg:'Deadline in 7 days',date:w.deadline});if(d===0)out.push({w,msg:'Deadline is today',date:w.deadline});if(d<0)out.push({w,msg:'Overdue by '+(-d)+' day(s)',date:w.deadline})});return out.sort((a,b)=>a.date.localeCompare(b.date))}
function item(title,sub,actions){return '<div class="item"><div><strong>'+title+'</strong><div class="meta">'+sub+'</div></div><div class="actions">'+actions+'</div></div>'}
function act(type,id,label,cls='secondary'){return '<button class="btn small '+cls+'" data-action="'+type+'" data-id="'+esc(id)+'">'+label+'</button>'}
function customerName(id){let c=db.customers.find(c=>digits(c.mobile)===digits(id));return c?c.name:''}
function refreshJobOptions(selected=''){
 const s=$('wId'),old=selected||s.value;
 s.innerHTML='<option value="">Select Customer Mobile (ID)</option>'+db.customers.map(c=>'<option value="'+digits(c.mobile)+'">'+esc(c.mobile)+'</option>').join('');
 if(old&&[...s.options].some(o=>o.value===digits(old)))s.value=digits(old);
 $('wCustomer').value=customerName(s.value);
}
function render(){
 const inc=db.money.filter(x=>x.type==='Income').reduce((a,x)=>a+x.amount,0),out=db.money.filter(x=>x.type==='Expense').reduce((a,x)=>a+x.amount,0);
 $('totalIncome').textContent=money(inc);$('totalExpense').textContent=money(out);$('balance').textContent=money(inc-out);
 $('manualDue').textContent=money(db.customers.reduce((a,c)=>a+Math.max(0,Number(c.net)||0),0));
 $('pendingCount').textContent=db.works.filter(w=>status(w)==='Pending').length;$('dueCount').textContent=db.works.filter(w=>status(w)==='Due').length;$('finishedCount').textContent=db.works.filter(w=>status(w)==='Finished').length;
 const now=new Date(),week=new Date(now);week.setDate(now.getDate()-6);const weekStart=[week.getFullYear(),String(week.getMonth()+1).padStart(2,'0'),String(week.getDate()).padStart(2,'0')].join('-'),month=today().slice(0,7);
 const sum=(type,fn)=>db.money.filter(x=>x.type===type&&fn(x)).reduce((a,x)=>a+x.amount,0);
 $('periodSummary').innerHTML='<p>Last 7 days — Income: <b>'+money(sum('Income',x=>x.date>=weekStart))+'</b> · Expense: <b>'+money(sum('Expense',x=>x.date>=weekStart))+'</b></p><p>This month — Income: <b>'+money(sum('Income',x=>x.date.startsWith(month)))+'</b> · Expense: <b>'+money(sum('Expense',x=>x.date.startsWith(month)))+'</b></p>';
 const rem=reminders();
 $('homeReminders').innerHTML=rem.length?rem.slice(0,5).map(r=>'<div class="item"><div><strong>'+esc(r.w.customer)+'</strong><div class="meta">'+esc(r.msg)+' · '+esc(formatMobile(r.w.id))+'</div></div></div>').join(''):'<div class="empty">No upcoming or overdue reminders.</div>';
 const q=String($('customerSearch').value||'').trim().toLowerCase(),qd=digits(q),cs=db.customers.filter(c=>!q||c.name.toLowerCase().includes(q)||digits(c.mobile).includes(qd));
 $('customerList').innerHTML=cs.length?cs.map(c=>item(esc(c.name)+' · '+esc(c.mobile),'Join '+esc(c.joinDate||'—')+' · Contact '+money(c.amount)+' · Net due '+money(c.net)+' · Deadline '+esc(c.deadline||'—'),act('cedit',digits(c.mobile),'Edit')+act('cdel',digits(c.mobile),'Delete','danger'))).join(''):'<div class="empty">No customer records yet.</div>';
 const mf=$('moneyFilter').value,ms=db.money.filter(x=>mf==='All'||x.type===mf).slice().reverse();
 $('moneyList').innerHTML=ms.length?ms.map(x=>item('<span class="'+(x.type==='Income'?'good':'bad')+'">'+esc(x.type)+'</span> · '+money(x.amount),esc(x.category)+' · '+esc(x.date)+' · '+esc(x.description),act('medit',x.id,'Edit')+act('mdel',x.id,'Delete','danger'))).join(''):'<div class="empty">No transactions yet.</div>';
 $('workList').innerHTML=db.works.slice().reverse().map(w=>item(esc(formatMobile(w.id))+' · '+esc(w.customer),'Job: '+esc(w.description)+' · Deadline '+esc(w.deadline)+' · Handover '+esc(w.handover||'—')+' · <b>'+esc(status(w))+'</b>',act('wedit',w.id,'Edit')+act('wdel',w.id,'Delete','danger'))).join('')||'<div class="empty">No job records yet.</div>';
 $('reminderList').innerHTML=rem.length?rem.map(r=>item(esc(r.w.customer)+' · '+esc(formatMobile(r.w.id)),esc(r.msg)+' · Deadline '+esc(r.date),act('wedit',r.w.id,'Open job'))).join(''):'<div class="empty">No upcoming or overdue reminders.</div>';
 refreshJobOptions($('wId').value);
}
function clearForm(form,hidden){form.reset();$(hidden).value=''}
function updateNet(){$('cNet').value=(Number($('cAmount').value||0)-Number($('cPay1').value||0)-Number($('cPay2').value||0)-Number($('cPay3').value||0)).toFixed(2)}
['cPay1','cPay2','cPay3','cAmount'].forEach(id=>$(id).oninput=updateNet);
$('cMobile').addEventListener('input',e=>{const pos=e.target.selectionStart,old=e.target.value;e.target.value=formatMobile(old);try{e.target.setSelectionRange(e.target.value.length,e.target.value.length)}catch{}});
$('customerForm').onsubmit=e=>{
 e.preventDefault();const mobile=formatMobile($('cMobile').value),key=$('customerEdit').value;
 if(!validMobile(mobile)){alert('Enter a valid 11-digit Bangladesh mobile number starting with 01. Example: 01710-020101');$('cMobile').focus();return}
 const existing=db.customers.find(c=>digits(c.mobile)===digits(mobile));
 if(existing&&digits(key)!==digits(mobile)){alert('This Customer Mobile (ID) already exists.');return}
 const c={mobile,joinDate:$('cJoin').value||today(),name:$('cName').value.trim(),nid:$('cNid').value.trim(),password:$('cPassword').value,amount:num($('cAmount').value),p1:num($('cPay1').value),p2:num($('cPay2').value),p3:num($('cPay3').value),net:Number($('cNet').value)||0,taken:$('cTaken').value,deadline:$('cDeadline').value,contactDetails:$('cContactDetails').value};
 if(!c.name){alert('Enter Customer Name.');return}
 if(key&&digits(key)!==digits(mobile)){
  const old=digits(key);db.customers=db.customers.filter(x=>digits(x.mobile)!==old);
  db.works=db.works.map(w=>digits(w.id)===old?{...w,id:digits(mobile),customer:c.name}:w);
 }
 const i=db.customers.findIndex(x=>digits(x.mobile)===digits(mobile));if(i<0)db.customers.push(c);else db.customers[i]=c;
 clearForm($('customerForm'),'customerEdit');$('cJoin').value=today();$('cNet').value='0.00';save();
};
$('customerClear').onclick=()=>{clearForm($('customerForm'),'customerEdit');$('cJoin').value=today();$('cNet').value='0.00';$('customerSearch').value='';render()};
$('moneyForm').onsubmit=e=>{e.preventDefault();const x={id:$('moneyEdit').value||uid('TX'),type:$('mType').value,category:$('mCategory').value,amount:num($('mAmount').value),date:$('mDate').value,description:$('mDescription').value};const i=db.money.findIndex(y=>y.id===x.id);if(i<0)db.money.push(x);else db.money[i]=x;clearForm($('moneyForm'),'moneyEdit');$('mDate').value=today();save()};
$('moneyClear').onclick=()=>{clearForm($('moneyForm'),'moneyEdit');$('mDate').value=today()};
$('wId').onchange=()=>{$('wCustomer').value=customerName($('wId').value)};
$('workForm').onsubmit=e=>{
 e.preventDefault();const id=digits($('wId').value),customer=customerName(id);
 if(!validMobile(id)||!customer){alert('Select a saved Customer Mobile (ID) first.');return}
 const w={id,customer,description:$('wDescription').value.trim(),received:$('wReceived').value,deadline:$('wDeadline').value,handover:$('wHandover').value,status:$('wStatus').value};
 if(!w.description){alert('Enter Job Description.');return}
 const i=db.works.findIndex(x=>digits(x.id)===id);if(i<0)db.works.push(w);else db.works[i]=w;
 clearForm($('workForm'),'workEdit');$('wReceived').value=today();refreshJobOptions();save();
};
$('workClear').onclick=()=>{clearForm($('workForm'),'workEdit');$('wReceived').value=today();refreshJobOptions()};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b)return;const {action,id}=b.dataset;
 if(action==='cdel'&&confirm('Delete this customer?'))db.customers=db.customers.filter(x=>digits(x.mobile)!==digits(id));
 if(action==='mdel'&&confirm('Delete this transaction?'))db.money=db.money.filter(x=>x.id!==id);
 if(action==='wdel'&&confirm('Delete this job record?'))db.works=db.works.filter(x=>digits(x.id)!==digits(id));
 if(action==='cedit'){
  const c=db.customers.find(x=>digits(x.mobile)===digits(id));if(!c)return;$('customerEdit').value=digits(c.mobile);
  [['cJoin','joinDate'],['cMobile','mobile'],['cName','name'],['cNid','nid'],['cPassword','password'],['cAmount','amount'],['cPay1','p1'],['cPay2','p2'],['cPay3','p3'],['cTaken','taken'],['cDeadline','deadline'],['cContactDetails','contactDetails']].forEach(([a,k])=>$(a).value=c[k]??'');$('cNet').value=Number(c.net||0).toFixed(2);
  document.querySelector('[data-tab="customers"]').click();
 }
 if(action==='medit'){const x=db.money.find(x=>x.id===id);if(!x)return;$('moneyEdit').value=id;[['mType','type'],['mCategory','category'],['mAmount','amount'],['mDate','date'],['mDescription','description']].forEach(([a,k])=>$(a).value=x[k]??'');document.querySelector('[data-tab="money"]').click()}
 if(action==='wedit'){const w=db.works.find(x=>digits(x.id)===digits(id));if(!w)return;$('workEdit').value=id;refreshJobOptions(id);$('wId').value=digits(id);$('wCustomer').value=customerName(id)||w.customer;[['wDescription','description'],['wReceived','received'],['wDeadline','deadline'],['wHandover','handover'],['wStatus','status']].forEach(([a,k])=>$(a).value=w[k]||'');document.querySelector('[data-tab="work"]').click()}
 save();
});

function downloadCsv(filename,headers,rows){
 const cell=v=>{let s=String(v??'');if(/^[=+@\\-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const content='\\uFEFF'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\\r\\n');
 const blob=new Blob([content],{type:'text/csv;charset=utf-8;'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('customerCsvBtn').onclick=()=>downloadCsv('Customer.csv',
 ['Customer Mobile ID','Join Date','Customer Name','NID No','Contact Amount','1st Pay','2nd Pay','3rd Pay','Net Payment','Taken Date','Deadline','Contact Details'],
 db.customers.map(x=>[x.mobile,x.joinDate,x.name,x.nid,x.amount,x.p1,x.p2,x.p3,x.net,x.taken,x.deadline,x.contactDetails]));
$('moneyCsvBtn').onclick=()=>downloadCsv('Income & Expense.csv',
 ['Record ID','Type','Category','Amount','Date','Description'],
 db.money.map(x=>[x.id,x.type,x.category,x.amount,x.date,x.description]));
$('workCsvBtn').onclick=()=>downloadCsv('Job Details.csv',
 ['Job ID','Customer Name','Status','Job Description','Receive Date','Deadline Date','Handover Date'],
 db.works.map(x=>[x.id,x.customer,x.status,x.description,x.received,x.deadline,x.handover]));

function closeMenu(){ $('sideMenu').classList.remove('open');$('menuOverlay').classList.remove('open');$('sideMenu').setAttribute('aria-hidden','true');$('menuOpen').setAttribute('aria-expanded','false') }\nfunction openMenu(){ $('sideMenu').classList.add('open');$('menuOverlay').classList.add('open');$('sideMenu').setAttribute('aria-hidden','false');$('menuOpen').setAttribute('aria-expanded','true') }\n$('menuOpen').onclick=openMenu;$('menuClose').onclick=closeMenu;$('menuOverlay').onclick=closeMenu;document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});\ndocument.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.menu-link').forEach(x=>x.classList.toggle('active',x.dataset.tab===b.dataset.tab));document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x.id===b.dataset.tab));closeMenu()});\n$('openMoney').onclick=()=>{$('money').classList.add('active');document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x.id==='money'));closeMenu()};
$('customerSearch').oninput=render;$('customerSearchBtn').onclick=render;$('customerSearch').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();render()}};$('moneyFilter').onchange=render;
$('themeBtn').onclick=()=>{document.documentElement.classList.toggle('dark');localStorage.setItem('iem-dark',document.documentElement.classList.contains('dark')?'1':'0')};if(localStorage.getItem('iem-dark')==='1')document.documentElement.classList.add('dark');
$('exportBtn').onclick=()=>{const a=document.createElement('a'),blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});a.href=URL.createObjectURL(blob);a.download='income-expense-backup-'+today()+'.json';a.click();URL.revokeObjectURL(a.href)};
$('importFile').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;const x=JSON.parse(await f.text());if(!Array.isArray(x.customers)||!Array.isArray(x.money)||!Array.isArray(x.works))throw Error();if(confirm('Replace current records with this backup?')){db=x;save();alert('Backup restored.')}}catch{alert('Invalid backup file.')}e.target.value=''};
$('clearAll').onclick=()=>{if(confirm('Permanently delete all records stored in this browser?')){db={customers:[],money:[],works:[]};save()}};
$('notifyBtn').onclick=async()=>{if(!('Notification'in window)){alert('Notifications are not supported by this browser.');return}const p=await Notification.requestPermission();alert(p==='granted'?'Browser notifications enabled. Open the app to review reminders.':'Notification permission was not granted.')};
$('cJoin').value=$('cTaken').value=$('mDate').value=$('wReceived').value=today();refreshJobOptions();render();
})();