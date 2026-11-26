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
  data.money=(data.money||[]).map(x=>({...x,customerMobile:x.customerMobile||'',personName:x.personName||'',caseNo:x.caseNo||'',investigationDate:x.investigationDate||''}));
  localStorage.setItem('iem-db',JSON.stringify(data));
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
 $('pendingCount').textContent=db.works.filter(w=>status(w)==='Pending').length;$('dueCount').textContent=db.works.filter(w=>status(w)==='Due').length;
 $('entryCount').textContent=db.works.filter(w=>w.status==='Entry level').length;$('appliedCount').textContent=db.works.filter(w=>w.status==='Applied').length;$('approvedCount').textContent=db.works.filter(w=>w.status==='Approved/DCR').length;$('handoverCount').textContent=db.works.filter(w=>Boolean(w.handover)||w.status==='Handover').length;
 const now=new Date(),week=new Date(now);week.setDate(now.getDate()-6);const weekStart=[week.getFullYear(),String(week.getMonth()+1).padStart(2,'0'),String(week.getDate()).padStart(2,'0')].join('-'),month=today().slice(0,7);
 const sum=(type,fn)=>db.money.filter(x=>x.type===type&&fn(x)).reduce((a,x)=>a+x.amount,0);
 $('periodSummary').innerHTML='<div class="period-row"><span class="period-icon">▦</span><div class="period-copy"><strong>Last 7 days</strong><span><b class="income">Income: '+money(sum('Income',x=>x.date>=weekStart))+'</b> &nbsp; · &nbsp; <b class="expense">Expense: '+money(sum('Expense',x=>x.date>=weekStart))+'</b></span></div><span class="hero-arrow" style="color:var(--muted)">›</span></div><div class="period-row"><span class="period-icon">▣</span><div class="period-copy"><strong>This month</strong><span><b class="income">Income: '+money(sum('Income',x=>x.date.startsWith(month)))+'</b> &nbsp; · &nbsp; <b class="expense">Expense: '+money(sum('Expense',x=>x.date.startsWith(month)))+'</b></span></div><span class="hero-arrow" style="color:var(--muted)">›</span></div>';
 const rem=reminders();
 const q=String($('customerSearch').value||'').trim().toLowerCase(),qd=digits(q),cs=db.customers.filter(c=>!q||String(c.name||'').toLowerCase().includes(q)||(qd.length>0&&digits(c.mobile).includes(qd)));
 $('customerList').innerHTML=cs.length?cs.map(c=>item(esc(c.name)+' · '+esc(c.mobile),'Join '+esc(c.joinDate||'—')+' · Contact '+money(c.amount)+' · Net due '+money(c.net)+' · Deadline '+esc(c.deadline||'—'),act('cedit',digits(c.mobile),'Edit')+act('cdel',digits(c.mobile),'Delete','danger'))).join(''):'<div class="empty">No customer records yet.</div>';
 const mf=$('moneyFilter').value,ms=db.money.filter(x=>mf==='All'||x.type===mf).slice().reverse();
 $('moneyList').innerHTML=ms.length?ms.map(x=>{const extra=x.customerMobile?' · '+esc(x.customerMobile)+' · '+esc(x.personName||''):x.caseNo?' · Case '+esc(x.caseNo)+' · Investigation '+esc(x.investigationDate||''):'';return item('<span class="'+(x.type==='Income'?'good':'bad')+'">'+esc(x.type)+'</span> · '+money(x.amount),esc(x.category)+extra+' · '+esc(x.date)+' · '+esc(x.description),act('medit',x.id,'Edit')+act('mdel',x.id,'Delete','danger'))}).join(''):'<div class="empty">No transactions yet.</div>';
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
const customerCategories=['Mutation','Khatian','Dhokila/ ldtax'];
const caseCategories=['M.P. Case','150 Dhara Case','S.F. Files'];
function updateMoneyCategoryFields(){
 const cat=$('mCategory').value,showCustomer=customerCategories.includes(cat),showCase=caseCategories.includes(cat);
 $('mCustomerFields').hidden=!showCustomer;$('mCaseFields').hidden=!showCase;
 $('mCustomerMobile').required=showCustomer;$('mPersonName').required=showCustomer;
 $('mCaseNo').required=showCase;$('mInvestigationDate').required=showCase;
}
$('mCategory').onchange=updateMoneyCategoryFields;
$('mCustomerMobile').addEventListener('input',e=>{e.target.value=formatMobile(e.target.value)});
$('moneyForm').onsubmit=e=>{
 e.preventDefault();
 const cat=$('mCategory').value;
 if(!cat){alert('Please select a Category.');$('mCategory').focus();return}
 const customerMode=customerCategories.includes(cat),caseMode=caseCategories.includes(cat);
 const mobile=formatMobile($('mCustomerMobile').value);
 if(customerMode&&(!validMobile(mobile)||!$('mPersonName').value.trim())){alert('Enter a valid Customer Mobile and Person Name.');return}
 if(caseMode&&(!$('mCaseNo').value.trim()||!$('mInvestigationDate').value)){alert('Enter Case No. and Investigation Date.');return}
 const x={id:$('moneyEdit').value||uid('TX'),type:$('mType').value,category:cat,amount:num($('mAmount').value),customerMobile:customerMode?mobile:'',personName:customerMode?$('mPersonName').value.trim():'',caseNo:caseMode?$('mCaseNo').value.trim():'',investigationDate:caseMode?$('mInvestigationDate').value:'',date:$('mDate').value,description:$('mDescription').value};
 const i=db.money.findIndex(y=>y.id===x.id);if(i<0)db.money.push(x);else db.money[i]=x;
 clearForm($('moneyForm'),'moneyEdit');$('mDate').value=today();updateMoneyCategoryFields();save()
};
$('moneyClear').onclick=()=>{clearForm($('moneyForm'),'moneyEdit');$('mDate').value=today();updateMoneyCategoryFields()};
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
 if(action==='medit'){const x=db.money.find(x=>x.id===id);if(!x)return;$('moneyEdit').value=id;const catSelect=$('mCategory');if(x.category&&!Array.from(catSelect.options).some(o=>o.value===x.category)){const legacy=document.createElement('option');legacy.value=x.category;legacy.textContent='Existing: '+x.category;catSelect.appendChild(legacy)}[['mType','type'],['mCategory','category'],['mAmount','amount'],['mCustomerMobile','customerMobile'],['mPersonName','personName'],['mCaseNo','caseNo'],['mInvestigationDate','investigationDate'],['mDate','date'],['mDescription','description']].forEach(([a,k])=>$(a).value=x[k]??'');updateMoneyCategoryFields();document.querySelector('[data-tab="money"]').click()}
 if(action==='wedit'){const w=db.works.find(x=>digits(x.id)===digits(id));if(!w)return;$('workEdit').value=id;refreshJobOptions(id);$('wId').value=digits(id);$('wCustomer').value=customerName(id)||w.customer;[['wDescription','description'],['wReceived','received'],['wDeadline','deadline'],['wHandover','handover'],['wStatus','status']].forEach(([a,k])=>$(a).value=w[k]||'');document.querySelector('[data-tab="work"]').click()}
 save();
});

function downloadCsv(filename,headers,rows){
 const cell=v=>{let s=String(v??'');if(/^[=+@\\-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const content='\uFEFF'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
 const blob=new Blob([content],{type:'text/csv;charset=utf-8;'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('customerCsvBtn').onclick=()=>downloadCsv('Customer.csv',
 ['Customer Mobile ID','Join Date','Customer Name','NID No','Contact Amount','1st Pay','2nd Pay','3rd Pay','Net Payment','Taken Date','Deadline','Contact Details'],
 db.customers.map(x=>[x.mobile,x.joinDate,x.name,x.nid,x.amount,x.p1,x.p2,x.p3,x.net,x.taken,x.deadline,x.contactDetails]));
$('moneyCsvBtn').onclick=()=>downloadCsv('Income & Expense.csv',
 ['Record ID','Type','Category','Amount','Customer Mobile','Person Name','Case No.','Investigation Date','Date','Description'],
 db.money.map(x=>[x.id,x.type,x.category,x.amount,x.customerMobile||'',x.personName||'',x.caseNo||'',x.investigationDate||'',x.date,x.description]));
$('workCsvBtn').onclick=()=>downloadCsv('Job Details.csv',
 ['Job ID','Customer Name','Status','Job Description','Receive Date','Deadline Date','Handover Date'],
 db.works.map(x=>[x.id,x.customer,x.status,x.description,x.received,x.deadline,x.handover]));

function closeMenu(){ $('sideMenu').classList.remove('open');$('menuOverlay').classList.remove('open');$('sideMenu').setAttribute('aria-hidden','true');$('menuOpen').setAttribute('aria-expanded','false') }
function openMenu(){ $('sideMenu').classList.add('open');$('menuOverlay').classList.add('open');$('sideMenu').setAttribute('aria-hidden','false');$('menuOpen').setAttribute('aria-expanded','true') }
$('menuOpen').onclick=openMenu;$('menuClose').onclick=closeMenu;$('menuOverlay').onclick=closeMenu;document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
const pageOrder=['home','customers','work','money','reminders','backup','personal'];
const pageNames=['Dashboard','Customer','Job Details','Income & Expense','Reminders','Backup'];
function showPage(tab){
 const index=pageOrder.indexOf(tab);if(index<0)return;
 document.querySelectorAll('.menu-link').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
 document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x.id===tab));
 document.querySelectorAll('.bottom-nav [data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
 $('previousPage').disabled=index===0;$('nextPage').disabled=index===pageOrder.length-1;
 closeMenu();
}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>showPage(b.dataset.tab));
$('previousPage').onclick=()=>{const i=pageOrder.findIndex(id=>$(id).classList.contains('active'));if(i>0)showPage(pageOrder[i-1])};
$('nextPage').onclick=()=>{const i=pageOrder.findIndex(id=>$(id).classList.contains('active'));if(i>=0&&i<pageOrder.length-1)showPage(pageOrder[i+1])};
$('scheduleHero').onclick=()=>showPage('reminders');$('viewAllJobs').onclick=()=>showPage('work');
$('businessHero').onclick=()=>showPage('money');
document.querySelectorAll('[data-job-filter]').forEach(b=>b.onclick=()=>showPage('work'));
function openPersonalInfo(){ $('pinOverlay').hidden=false;$('personalPin').value='';$('pinError').hidden=true;setTimeout(()=>$('personalPin').focus(),40) }
$('personalHero').onclick=openPersonalInfo;$('bottomPersonal').onclick=openPersonalInfo;
function closePin(){ $('pinOverlay').hidden=true;$('personalPin').value='';$('pinError').hidden=true }
$('pinCancel').onclick=closePin;
$('pinUnlock').onclick=()=>{const pin=$('personalPin').value;if(!pin)return;if(pin==='Rayat&Raika'){closePin();showPage('personal')}else{$('pinError').hidden=false;$('personalPin').focus();$('personalPin').select()}};
$('personalPin').onkeydown=e=>{if(e.key==='Enter')$('pinUnlock').click();if(e.key==='Escape')closePin()};
$('personalBack').onclick=()=>showPage('home');
showPage('home');
function openCustomerSearch(){
 const q=String($('customerSearch').value||'').trim().toLowerCase(),qd=digits(q);
 if(!q){alert('Enter a customer name or mobile number to search.');$('customerSearch').focus();return}
 const matches=db.customers.filter(c=>String(c.name||'').toLowerCase().includes(q)||(qd.length>0&&digits(c.mobile).includes(qd)));
 $('customerSearchResults').innerHTML=matches.length?matches.map(c=>'<div class="customer-result"><strong>'+esc(c.name)+'</strong><div class="meta">Customer Mobile (ID): '+esc(c.mobile)+'<br>Join Date: '+esc(c.joinDate||'—')+'<br>NID No.: '+esc(c.nid||'—')+'<br>Contact Amount: '+money(c.amount)+'<br>1st Pay: '+money(c.p1)+' · 2nd Pay: '+money(c.p2)+' · 3rd Pay: '+money(c.p3)+'<br>Net Payment: '+money(c.net)+'<br>Taken Date: '+esc(c.taken||'—')+'<br>Deadline: '+esc(c.deadline||'—')+'<br>Contact Details: '+esc(c.contactDetails||'—')+'</div><div class="actions">'+act('cedit',digits(c.mobile),'Edit')+'</div></div>').join(''):'<div class="empty">No matching customer found.</div>';
 $('customerForm').hidden=true;$('customerList').parentElement.hidden=true;$('customerCsvBtn').parentElement.hidden=true;
 $('customerSearchPage').hidden=false;$('customerSearchPage').classList.remove('active');void $('customerSearchPage').offsetWidth;$('customerSearchPage').classList.add('active');
}
function closeCustomerSearch(){
 $('customerSearchPage').classList.remove('active');$('customerSearchPage').hidden=true;
 $('customerForm').hidden=false;$('customerList').parentElement.hidden=false;$('customerCsvBtn').parentElement.hidden=false;
}
$('customerSearchBtn').onclick=openCustomerSearch;
$('customerSearch').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();openCustomerSearch()}};
$('customerSearchBack').onclick=closeCustomerSearch;$('moneyFilter').onchange=render;
function applyTheme(dark){document.documentElement.classList.toggle('dark',dark);$('themeBtn').textContent=dark?'☀':'☾';$('themeBtn').setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode')}
applyTheme(localStorage.getItem('iem-dark')==='1');$('themeBtn').onclick=()=>{const dark=!document.documentElement.classList.contains('dark');localStorage.setItem('iem-dark',dark?'1':'0');applyTheme(dark)};
$('exportBtn').onclick=()=>{const a=document.createElement('a'),blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});a.href=URL.createObjectURL(blob);a.download='income-expense-backup-'+today()+'.json';a.click();URL.revokeObjectURL(a.href)};
$('importFile').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;const x=JSON.parse(await f.text());if(!Array.isArray(x.customers)||!Array.isArray(x.money)||!Array.isArray(x.works))throw Error();if(confirm('Replace current records with this backup?')){db=x;save();alert('Backup restored.')}}catch{alert('Invalid backup file.')}e.target.value=''};
$('clearAll').onclick=()=>{if(confirm('Permanently delete all records stored in this browser?')){db={customers:[],money:[],works:[]};save()}};
$('notifyBtn').onclick=async()=>{if(!('Notification'in window)){alert('Notifications are not supported by this browser.');return}const p=await Notification.requestPermission();alert(p==='granted'?'Browser notifications enabled. Open the app to review reminders.':'Notification permission was not granted.')};
$('cJoin').value=$('cTaken').value=$('mDate').value=$('wReceived').value=today();refreshJobOptions();render();
})();