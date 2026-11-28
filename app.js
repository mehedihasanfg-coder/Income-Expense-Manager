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
function amountDigits(value){
 let s=String(value??'').replace(/৳|BDT|\/-/g,'').replace(/,/g,'').replace(/[^0-9.]/g,'');
 const p=s.split('.');return p[0].slice(0,8)+(p.length>1?'.'+p.slice(1).join('').slice(0,2):'');
}
function amountNumber(value){const raw=amountDigits(value);if(!raw||raw==='.')return '';const n=Number(raw);return Number.isFinite(n)?n:''}
function formatTaka(value){
 const s=amountDigits(value);if(!s)return '';
 const [whole,decimal]=s.split('.');const grouped=whole.replace(/\B(?=(\d{2})+(\d{1})?$)/g,',');
 return grouped+(decimal!==undefined?'.'+decimal:'')+'/- ৳';
}
['wContactAmount','wAmount','wTotalPayingAmount'].forEach(id=>{
 const field=$(id);
 field.addEventListener('focus',()=>{field.value=amountDigits(field.value)});
 field.addEventListener('input',()=>{const raw=amountDigits(field.value);const [whole,decimal]=raw.split('.');field.value=whole.replace(/\B(?=(\d{2})+(\d{1})?$)/g,',')+(decimal!==undefined?'.'+decimal:'')});
 field.addEventListener('blur',()=>{field.value=formatTaka(field.value)});
});
function refreshJobOptions(selected=''){
 const s=$('wId'),old=selected||s.value;
 s.innerHTML='<option value="">Select Mobile No.</option>'+db.customers.map(c=>'<option value="'+digits(c.mobile)+'">'+esc(c.mobile)+'</option>').join('');
 if(old&&[...s.options].some(o=>o.value===digits(old)))s.value=digits(old);
 const c=db.customers.find(x=>digits(x.mobile)===digits(s.value));
 $('wCustomer').value=c?c.name:'';
 $('wQty').value=c?(c.qty||''):'';
}
let dashboardJobFilter='';
function dashboardJobs(group){
 return db.works.filter(w=>{
  const selected=String(w.status||'').trim().toLowerCase();
  if(group==='Entry Level')return selected==='entry level';
  if(group==='Applied')return selected==='applied';
  if(group==='Approved/DCR')return selected==='approved/dcr';
  if(group==='Handover')return selected==='handover';
  if(selected==='approved/dcr')return false;
  if(w.contactAmount===''||w.contactAmount===null||w.contactAmount===undefined||w.totalPayingAmount===''||w.totalPayingAmount===null||w.totalPayingAmount===undefined)return false;
  const contact=Number(w.contactAmount),paid=Number(w.totalPayingAmount);
  if(!Number.isFinite(contact)||contact<=0||!Number.isFinite(paid)||paid<0)return false;
  if(group==='Pending')return paid<=contact*0.50;
  if(group==='OverDues')return paid>contact*0.50&&paid<=contact*0.75;
  return false;
 });
}
function renderDashboardJobResults(){
 const box=$('dashboardJobResults');
 if(!dashboardJobFilter){box.hidden=true;return}
 const jobs=dashboardJobs(dashboardJobFilter).slice().reverse();
 $('dashboardJobTitle').textContent=dashboardJobFilter+' Jobs ('+jobs.length+')';
 $('dashboardJobList').innerHTML=jobs.length?jobs.map(w=>item(esc(formatMobile(w.id))+' · '+esc(w.customer),'Contact: '+money(Number(w.contactAmount)||0)+' · Total Paying: '+money(Number(w.totalPayingAmount)||0)+' · '+esc(w.category||'')+' · '+esc(w.description||''),act('wedit',w.id,'Edit')+act('wdel',w.id,'Delete','danger'))).join(''):'<div class="empty">No matching jobs found.</div>';
 box.hidden=false;
}
function render(){
 $('pendingCount').textContent=dashboardJobs('Pending').length;$('dueCount').textContent=dashboardJobs('OverDues').length;
 $('entryCount').textContent=dashboardJobs('Entry Level').length;$('appliedCount').textContent=dashboardJobs('Applied').length;$('approvedCount').textContent=dashboardJobs('Approved/DCR').length;$('handoverCount').textContent=dashboardJobs('Handover').length;
 renderDashboardJobResults();
 const now=new Date(),week=new Date(now);week.setDate(now.getDate()-6);const weekStart=[week.getFullYear(),String(week.getMonth()+1).padStart(2,'0'),String(week.getDate()).padStart(2,'0')].join('-'),month=today().slice(0,7);
 const sum=(type,fn)=>db.money.filter(x=>x.type===type&&fn(x)).reduce((a,x)=>a+x.amount,0);
 $('periodSummary').innerHTML='<div class="period-row"><span class="period-icon">▦</span><div class="period-copy"><strong>Last 7 days</strong><span><b class="income">Income: '+money(sum('Income',x=>x.date>=weekStart))+'</b> &nbsp; · &nbsp; <b class="expense">Expense: '+money(sum('Expense',x=>x.date>=weekStart))+'</b></span></div><span class="hero-arrow" style="color:var(--muted)">›</span></div><div class="period-row"><span class="period-icon">▣</span><div class="period-copy"><strong>This month</strong><span><b class="income">Income: '+money(sum('Income',x=>x.date.startsWith(month)))+'</b> &nbsp; · &nbsp; <b class="expense">Expense: '+money(sum('Expense',x=>x.date.startsWith(month)))+'</b></span></div><span class="hero-arrow" style="color:var(--muted)">›</span></div>';
 const rem=reminders();
 const q=String($('customerSearch').value||'').trim().toLowerCase(),qd=digits(q),cs=db.customers.filter(c=>!q||String(c.name||'').toLowerCase().includes(q)||(qd.length>0&&digits(c.mobile).includes(qd)));
 $('customerList').innerHTML=cs.length?cs.map(c=>item(esc(c.name)+' · '+esc(c.mobile),'Qut.: '+esc(c.qty||'—'),act('cedit',digits(c.mobile),'Edit')+act('cdel',digits(c.mobile),'Delete','danger'))).join(''):'<div class="empty">No customer records yet.</div>';
 const mf=$('moneyFilter').value,ms=db.money.filter(x=>mf==='All'||x.type===mf).slice().reverse();
 $('moneyList').innerHTML=ms.length?ms.map(x=>{const extra=x.customerMobile?' · '+esc(x.customerMobile)+' · '+esc(x.personName||''):x.caseNo?' · Case '+esc(x.caseNo)+' · Investigation '+esc(x.investigationDate||''):'';return item('<span class="'+(x.type==='Income'?'good':'bad')+'">'+esc(x.type)+'</span> · '+money(x.amount),esc(x.category)+extra+' · '+esc(x.date)+' · '+esc(x.description),act('medit',x.id,'Edit')+act('mdel',x.id,'Delete','danger'))}).join(''):'<div class="empty">No transactions yet.</div>';
 $('workList').innerHTML=db.works.slice().reverse().map(w=>item(esc(formatMobile(w.id))+' · '+esc(w.customer),'Job: '+esc(w.description)+' · Deadline '+esc(w.deadline)+' · Handover '+esc(w.handover||'—')+' · <b>'+esc(status(w))+'</b>',act('wedit',w.id,'Edit')+act('wdel',w.id,'Delete','danger'))).join('')||'<div class="empty">No job records yet.</div>';
 const selectedReminders=db.works.filter(w=>w.reminder===true).slice().sort((a,b)=>String(a.deadline||'').localeCompare(String(b.deadline||'')));
 $('reminderList').innerHTML=selectedReminders.length?selectedReminders.map(w=>item(esc(w.customer)+' · '+esc(formatMobile(w.id)), 'Deadline: '+esc(w.deadline||'—')+' · Receive: '+esc(w.received||'—')+' · Status: '+esc(status(w))+' · '+esc(w.description||''),act('wedit',w.id,'Open job'))).join(''):'<div class="empty">None of them files are Reminder!</div>';
 refreshJobOptions($('wId').value);
}
function clearForm(form,hidden){form.reset();$(hidden).value=''}
$('cQty').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,2)});
$('cMobile').addEventListener('input',e=>{const pos=e.target.selectionStart,old=e.target.value;e.target.value=formatMobile(old);try{e.target.setSelectionRange(e.target.value.length,e.target.value.length)}catch{}});
$('customerForm').onsubmit=e=>{
 e.preventDefault();const mobile=formatMobile($('cMobile').value),key=$('customerEdit').value;
 if(!validMobile(mobile)){alert('Enter a valid 11-digit Bangladesh mobile number starting with 01. Example: 01710-020101');$('cMobile').focus();return}
 const existing=db.customers.find(c=>digits(c.mobile)===digits(mobile));
 if(existing&&digits(key)!==digits(mobile)){alert('This Customer Mobile (ID) already exists.');return}
 const previous=db.customers.find(x=>digits(x.mobile)===digits(key||mobile))||{};
 const c={...previous,mobile,qty:$('cQty').value.replace(/\D/g,'').slice(0,2),name:$('cName').value.trim(),nid:$('cNid').value.trim(),password:$('cPassword').value,contactDetails:$('cContactDetails').value};
 if(!c.name){alert('Enter Customer Name.');return}
 if(key&&digits(key)!==digits(mobile)){
  const old=digits(key);db.customers=db.customers.filter(x=>digits(x.mobile)!==old);
  db.works=db.works.map(w=>digits(w.id)===old?{...w,id:digits(mobile),customer:c.name}:w);
 }
 const i=db.customers.findIndex(x=>digits(x.mobile)===digits(mobile));if(i<0)db.customers.push(c);else db.customers[i]=c;
 clearForm($('customerForm'),'customerEdit');save();
};
$('customerClear').onclick=()=>{clearForm($('customerForm'),'customerEdit');$('customerSearch').value='';render()};
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
$('wId').onchange=()=>{
 const c=db.customers.find(x=>digits(x.mobile)===digits($('wId').value));
 if(!c){$('wCustomer').value='';$('wQty').value='';$('customerRequiredModal').hidden=false;return}
 $('wCustomer').value=c.name||'';$('wQty').value=c.qty||'';
};
$('customerRequiredOk').onclick=()=>{$('customerRequiredModal').hidden=true;showPage('customers')};
$('workForm').onsubmit=e=>{
 e.preventDefault();const id=digits($('wId').value),customer=customerName(id);
 if(!validMobile(id)||!customer){alert('Select a saved Customer Mobile (ID) first.');return}
 const w={id,customer,qty:$('wQty').value,category:$('wCategory').value,description:$('wDescription').value.trim(),contactAmount:amountNumber($('wContactAmount').value),received:$('wReceived').value,eip:$('wEip').value,amount:amountNumber($('wAmount').value),deadline:$('wDeadline').value,handover:$('wHandover').value,totalPayingAmount:amountNumber($('wTotalPayingAmount').value),status:$('wStatus').value,reminder:$('wReminder').checked};
 if(!w.description){alert('Enter Job Description.');return}
 const i=db.works.findIndex(x=>digits(x.id)===id);if(i<0)db.works.push(w);else db.works[i]=w;
 clearForm($('workForm'),'workEdit');$('wReceived').value=today();refreshJobOptions();save();
};
$('workClear').onclick=()=>{clearForm($('workForm'),'workEdit');$('wReceived').value=today();$('wReminder').checked=false;refreshJobOptions()};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b)return;const {action,id}=b.dataset;
 if(action==='cdel'&&confirm('Delete this customer?'))db.customers=db.customers.filter(x=>digits(x.mobile)!==digits(id));
 if(action==='mdel'&&confirm('Delete this transaction?'))db.money=db.money.filter(x=>x.id!==id);
 if(action==='wdel'&&confirm('Delete this job record?'))db.works=db.works.filter(x=>digits(x.id)!==digits(id));
 if(action==='cedit'){
  const c=db.customers.find(x=>digits(x.mobile)===digits(id));if(!c)return;$('customerEdit').value=digits(c.mobile);
  [['cQty','qty'],['cMobile','mobile'],['cName','name'],['cNid','nid'],['cPassword','password'],['cContactDetails','contactDetails']].forEach(([a,k])=>$(a).value=c[k]??'');
  document.querySelector('[data-tab="customers"]').click();
 }
 if(action==='medit'){const x=db.money.find(x=>x.id===id);if(!x)return;$('moneyEdit').value=id;const catSelect=$('mCategory');if(x.category&&!Array.from(catSelect.options).some(o=>o.value===x.category)){const legacy=document.createElement('option');legacy.value=x.category;legacy.textContent='Existing: '+x.category;catSelect.appendChild(legacy)}[['mType','type'],['mCategory','category'],['mAmount','amount'],['mCustomerMobile','customerMobile'],['mPersonName','personName'],['mCaseNo','caseNo'],['mInvestigationDate','investigationDate'],['mDate','date'],['mDescription','description']].forEach(([a,k])=>$(a).value=x[k]??'');updateMoneyCategoryFields();document.querySelector('[data-tab="money"]').click()}
 if(action==='wedit'){const w=db.works.find(x=>digits(x.id)===digits(id));if(!w)return;$('workEdit').value=id;refreshJobOptions(id);$('wId').value=digits(id);$('wCustomer').value=customerName(id)||w.customer;[['wQty','qty'],['wCategory','category'],['wDescription','description'],['wReceived','received'],['wEip','eip'],['wDeadline','deadline'],['wHandover','handover'],['wStatus','status']].forEach(([a,k])=>$(a).value=w[k]||'');[['wContactAmount','contactAmount'],['wAmount','amount'],['wTotalPayingAmount','totalPayingAmount']].forEach(([a,k])=>$(a).value=formatTaka(w[k]));$('wReminder').checked=w.reminder===true;document.querySelector('[data-tab="work"]').click()}
 save();
});

function downloadCsv(filename,headers,rows){
 const cell=v=>{let s=String(v??'');if(/^[=+@\\-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const content='\uFEFF'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
 const blob=new Blob([content],{type:'text/csv;charset=utf-8;'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('customerCsvBtn').onclick=()=>downloadCsv('Customer.csv',
 ['Qut.','Cust. Mobile (ID)','Customer Name','NID No.','Password','Contact Details'],
 db.customers.map(x=>[x.qty||'',x.mobile,x.name,x.nid,x.password,x.contactDetails]));
$('moneyCsvBtn').onclick=()=>downloadCsv('Income & Expense.csv',
 ['Record ID','Type','Category','Amount','Customer Mobile','Person Name','Case No.','Investigation Date','Date','Description'],
 db.money.map(x=>[x.id,x.type,x.category,x.amount,x.customerMobile||'',x.personName||'',x.caseNo||'',x.investigationDate||'',x.date,x.description]));
$('workCsvBtn').onclick=()=>downloadCsv('Job Details.csv',
 ['Job ID','Customer Name','Status','Job Description','Contact Amount','Received Date','EIP','Amount','Datelines','Handover','Total Paying Amount','Reminder'],
 db.works.map(x=>[x.id,x.customer,x.status,x.description,x.contactAmount??'',x.received,x.eip||'',x.amount??'',x.deadline,x.handover,x.totalPayingAmount??'',x.reminder?'Yes':'No']));

function closeMenu(){ $('sideMenu').classList.remove('open');$('menuOverlay').classList.remove('open');$('sideMenu').setAttribute('aria-hidden','true');$('menuOpen').setAttribute('aria-expanded','false') }
function openMenu(){ $('sideMenu').classList.add('open');$('menuOverlay').classList.add('open');$('sideMenu').setAttribute('aria-hidden','false');$('menuOpen').setAttribute('aria-expanded','true') }
$('menuOpen').onclick=openMenu;$('menuClose').onclick=closeMenu;$('menuOverlay').onclick=closeMenu;document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
const pageOrder=['home','customers','work','money','personal','reminders','backup'];
const pageNames={home:'Dashboard',customers:'Customers',work:'Job Overview',money:'Income & Expense',personal:'Personal Info',reminders:'Schedule JOBS Reminder',backup:'Backup & Restore'};
pageOrder.filter(id=>id!=='home').forEach(id=>{
 const panel=$(id);
 if(panel&&!panel.querySelector('.section-page-head')){
  const head=document.createElement('div');head.className='section-page-head';
  head.innerHTML='<button type="button" aria-label="Back to Dashboard">‹</button><strong>'+pageNames[id]+'</strong>';
  head.querySelector('button').onclick=()=>showPage('home');
  panel.insertBefore(head,panel.firstChild);
 }
});
function showPage(tab){
 const index=pageOrder.indexOf(tab);if(index<0)return;
 if(tab==='reminders')render();
 document.querySelectorAll('.menu-link').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
 document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x.id===tab));
 document.querySelectorAll('.bottom-nav [data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
 $('bottomPersonal').classList.toggle('active',tab==='personal');
 $('previousPage').disabled=index===0;$('nextPage').disabled=index===pageOrder.length-1;
 closeMenu();
}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>showPage(b.dataset.tab));
$('previousPage').onclick=()=>{const i=pageOrder.findIndex(id=>$(id).classList.contains('active'));if(i>0)showPage(pageOrder[i-1])};
$('nextPage').onclick=()=>{const i=pageOrder.findIndex(id=>$(id).classList.contains('active'));if(i>=0&&i<pageOrder.length-1)showPage(pageOrder[i+1])};
$('scheduleHero').onclick=()=>{render();showPage('reminders')};$('viewAllJobs').onclick=()=>showPage('work');$('reminderBack').onclick=()=>showPage('home');
$('businessHero').onclick=()=>showPage('money');
document.querySelectorAll('[data-job-filter]').forEach(b=>b.onclick=()=>{dashboardJobFilter=b.dataset.jobFilter;renderDashboardJobResults();showPage('home')});
$('closeDashboardJobResults').onclick=()=>{dashboardJobFilter='';renderDashboardJobResults()};
function openPersonalInfo(){ $('pinOverlay').hidden=false;$('personalPin').value='';$('pinError').hidden=true;setTimeout(()=>$('personalPin').focus(),40) }
$('personalHero').onclick=openPersonalInfo;$('bottomPersonal').onclick=openPersonalInfo;$('sidePersonal').onclick=openPersonalInfo;
function closePin(){ $('pinOverlay').hidden=true;$('personalPin').value='';$('pinError').hidden=true }
$('pinCancel').onclick=closePin;
$('pinUnlock').onclick=()=>{const pin=$('personalPin').value;if(!pin)return;if(pin==='Rayat&Raika'){closePin();showPage('personal')}else{$('pinError').hidden=false;$('personalPin').focus();$('personalPin').select()}};
$('personalPin').onkeydown=e=>{if(e.key==='Enter')$('pinUnlock').click();if(e.key==='Escape')closePin()};
$('personalBack').onclick=()=>showPage('home');
function loadProfile(){let p={};try{p=JSON.parse(localStorage.getItem('iem-profile')||'{}')}catch{};[['profileName','name'],['profileMobile','mobile'],['profileEmail','email'],['profileAddress','address'],['profileBusiness','business'],['profileNotes','notes']].forEach(([id,key])=>$(id).value=p[key]||'')}
$('profileForm').onsubmit=e=>{e.preventDefault();const p={name:$('profileName').value.trim(),mobile:$('profileMobile').value.trim(),email:$('profileEmail').value.trim(),address:$('profileAddress').value,business:$('profileBusiness').value.trim(),notes:$('profileNotes').value};localStorage.setItem('iem-profile',JSON.stringify(p));alert('Personal information saved on this device.')};
$('profileClear').onclick=()=>{if(confirm('Clear the personal information form?'))$('profileForm').reset()};
loadProfile();
showPage('home');
function openCustomerSearch(){
 const q=String($('customerSearch').value||'').trim().toLowerCase(),qd=digits(q);
 if(!q){alert('Enter a customer name or mobile number to search.');$('customerSearch').focus();return}
 const matches=db.customers.filter(c=>String(c.name||'').toLowerCase().includes(q)||(qd.length>0&&digits(c.mobile).includes(qd)));
 $('customerSearchResults').innerHTML=matches.length?matches.map(c=>'<div class="customer-result"><strong>'+esc(c.name)+'</strong><div class="meta">Qut.: '+esc(c.qty||'—')+'<br>Cust. Mobile (ID): '+esc(c.mobile)+'<br>NID No.: '+esc(c.nid||'—')+'<br>Password: '+esc(c.password||'—')+'<br>Contact Details: '+esc(c.contactDetails||'—')+'</div><div class="actions">'+act('cedit',digits(c.mobile),'Edit')+'</div></div>').join(''):'<div class="empty">No matching customer found.</div>';
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
$('mDate').value=$('wReceived').value=today();refreshJobOptions();render();
})();