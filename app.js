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
  data.money=(data.money||[]).map(x=>({...x,customerMobile:x.customerMobile||'',personName:x.personName||'',personMobile:x.personMobile||'',jobRecordNo:x.jobRecordNo||'',mutationApplicationNo:x.mutationApplicationNo||'',rorNo:x.rorNo||'',mousaNo:x.mousaNo||'',caseNo:x.caseNo||'',investigationDate:x.investigationDate||''}));
  const usedRecordNos=new Set();let jobSeq=0;
  data.works=data.works.map(w=>{
   if(!/^01\d{9}$/.test(digits(w.id))){
    const c=data.customers.find(c=>c.name===w.customer);
    if(c)w={...w,id:digits(c.mobile)};
   }
   const stage=w.eip||'1st Pay',legacyNo=stage==='2nd Pay'?2:stage==='3rd Pay'?3:stage==='4th Pay'?4:stage==='Final Pay'?5:1;
   const amounts=[w.amount??'',w.amount2??'',w.amount3??'',w.amount4??'',w.amount5??''];
   if(w.paymentSchema!==2){amounts.fill('');amounts[legacyNo-1]=w.amount??'';}
   const total=amounts.reduce((sum,v)=>sum+(Number(v)||0),0);
   let recordNo=w.recordNo;
   if(!recordNo||usedRecordNos.has(recordNo))recordNo='JOB-'+Date.now().toString(36).toUpperCase()+'-'+(++jobSeq);
   usedRecordNos.add(recordNo);
   return {...w,recordNo,paymentSchema:2,mutationApplicationNo:w.mutationApplicationNo||'',caseNo:w.caseNo||'',investigationDate:w.investigationDate||'',rorNo:w.rorNo||'',mousaNo:w.mousaNo||'',amount:amounts[0],amount2:amounts[1],amount3:amounts[2],amount4:amounts[3],amount5:amounts[4],totalPayingAmount:total};
  });
  localStorage.setItem('iem-db',JSON.stringify(data));
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
function updatePaymentTotal(){
 const total=[1,2,3,4,5].reduce((sum,n)=>sum+(Number(amountNumber($(n===1?'wAmount':'wAmount'+n).value))||0),0);
 const formatted=total?formatTaka(total):'';
 $('wTotalPayingAmount').value=formatted;$('wMutationTotal').value=formatted;
}
function paymentInput(id){
 const field=$(id);
 field.addEventListener('focus',()=>{field.value=amountDigits(field.value)});
 field.addEventListener('input',()=>{const raw=amountDigits(field.value);const [whole,decimal]=raw.split('.');field.value=whole.replace(/\B(?=(\d{2})+(\d{1})?$)/g,',')+(decimal!==undefined?'.'+decimal:'');updatePaymentTotal()});
 field.addEventListener('blur',()=>{field.value=formatTaka(field.value);updatePaymentTotal()});
}
['wContactAmount','wAmount'].forEach(paymentInput);
function updatePaymentFields(){
 const stage=$('wEip').value;
 const count=stage==='2nd Pay'?2:stage==='3rd Pay'?3:stage==='4th Pay'?4:stage==='Final Pay'?5:1;
 const names=['2nd','3rd','4th','Final'];
 const container=$('wExtraPaymentFields');
 if(!container.dataset.built){
  container.innerHTML=names.map((name,index)=>'<div class="payment-extra" id="paymentRow'+(index+2)+'"><div class="field"><label>'+name+' Amount</label><input id="wAmount'+(index+2)+'" class="job-money" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00"></div></div>').join('');
  names.forEach((name,index)=>paymentInput('wAmount'+(index+2)));
  container.dataset.built='1';
 }
 container.hidden=count===1;
 container.style.display=count===1?'none':'block';
 for(let n=2;n<=5;n++){
  const row=$('paymentRow'+n);
  const visible=n<=count;
  row.hidden=!visible;
  row.style.display=visible?'block':'none';
 }
}
function updateJobCategoryFields(){
 const cat=$('wCategory').value;
 const mutation=cat==='Mutation';
 const section=['Section (144/145)','Section (150)','S.F Files'].includes(cat);
 const ror=['CP (ROR)','Draft (ROR)','Search (ROR)','Corr. (ROR)'].includes(cat);
 $('wMutationFields').hidden=!mutation;$('wSectionFields').hidden=!section;$('wRorFields').hidden=!ror;$('wTotalPayingField').hidden=mutation;
}
$('wCategory').addEventListener('change',updateJobCategoryFields);
$('wEip').addEventListener('change',updatePaymentFields);

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
 $('dashboardJobList').innerHTML=jobs.length?jobs.map(w=>item(esc(formatMobile(w.id))+' · '+esc(w.customer),'Contact: '+money(Number(w.contactAmount)||0)+' · Total Paying: '+money(Number(w.totalPayingAmount)||0)+' · '+esc(w.category||'')+' · '+esc(w.description||''),act('wedit',w.recordNo,'Edit')+act('wdel',w.recordNo,'Delete','danger'))).join(''):'<div class="empty">No matching jobs found.</div>';
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
 const cs=db.customers;
 $('customerList').innerHTML=cs.length?cs.map(c=>item(esc(c.name)+' · '+esc(c.mobile),'Qut.: '+esc(c.qty||'—'),act('cedit',digits(c.mobile),'Edit')+act('cdel',digits(c.mobile),'Delete','danger'))).join(''):'<div class="empty">No customer records yet.</div>';
 const mf=$('moneyFilter').value,ms=db.money.filter(x=>mf==='All'||x.type===mf).slice().reverse();
 $('moneyList').innerHTML=ms.length?ms.map(x=>{const extra=(x.jobRecordNo?' · Job '+esc(x.jobRecordNo):'')+(x.customerMobile?' · '+esc(x.customerMobile):'')+(x.personName?' · '+esc(x.personName):'')+(x.personMobile?' ('+esc(x.personMobile)+')':'')+(x.caseNo?' · Case '+esc(x.caseNo):'');return item('<span class="'+(x.type==='Income'?'good':'bad')+'">'+esc(x.type)+'</span> · '+money(x.amount),esc(x.category)+extra+' · '+esc(x.date)+' · '+esc(x.description),act('medit',x.id,'Edit')+act('mdel',x.id,'Delete','danger'))}).join(''):'<div class="empty">No transactions yet.</div>';
 $('workList').innerHTML=db.works.slice().reverse().map(w=>item(esc(formatMobile(w.id))+' · '+esc(w.customer),'Job: '+esc(w.description)+' · Deadline '+esc(w.deadline)+' · Handover '+esc(w.handover||'—')+' · <b>'+esc(status(w))+'</b>',act('wedit',w.recordNo,'Edit')+act('wdel',w.recordNo,'Delete','danger'))).join('')||'<div class="empty">No job records yet.</div>';
 const selectedReminders=db.works.filter(w=>w.reminder===true).slice().sort((a,b)=>String(a.deadline||'').localeCompare(String(b.deadline||'')));
 $('reminderList').innerHTML=selectedReminders.length?selectedReminders.map(w=>item(esc(w.customer)+' · '+esc(formatMobile(w.id)), 'Deadline: '+esc(w.deadline||'—')+' · Receive: '+esc(w.received||'—')+' · Status: '+esc(status(w))+' · '+esc(w.description||''),act('wedit',w.recordNo,'Open job'))).join(''):'<div class="empty">None of them files are Reminder!</div>';
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
$('customerClear').onclick=()=>{clearForm($('customerForm'),'customerEdit');render()};
let activeMoneyMobile='',activeMoneyJob='';
function updateMoneyCategoryFields(){
 const cat=$('mCategory').value;
 $('mMutationFields').hidden=cat!=='Mutation';
 $('mSectionFields').hidden=!['Section (144/145)','Section (150)','S.F Files'].includes(cat);
 $('mRorFields').hidden=!['CP (ROR)','Draft (ROR)','Search (ROR)','Corr. (ROR)'].includes(cat);
}
$('mCategory').onchange=updateMoneyCategoryFields;
$('mPersonMobile').addEventListener('input',e=>{e.target.value=formatMobile(e.target.value)});
function findMoneyCustomer(){
 const mobile=digits($('mSearchMobile').value);
 if(!validMobile(mobile)){ $('mSearchMessage').textContent='Enter a valid saved 11-digit customer mobile number.';$('mAllTransactionsCard').hidden=true;$('mCustomerCard').hidden=true;$('mJobPicker').hidden=true;$('mJobWorkspace').hidden=true;return}
 const c=db.customers.find(x=>digits(x.mobile)===mobile);
 if(!c){$('mSearchMessage').textContent='No customer found with this mobile number.';$('mAllTransactionsCard').hidden=true;$('mCustomerCard').hidden=true;$('mJobPicker').hidden=true;$('mJobWorkspace').hidden=true;return}
 activeMoneyMobile=mobile;
 $('mSearchMessage').textContent='Customer found. Select one of their job records.';$('mAllTransactionsCard').hidden=false;
 $('mCustomerCard').hidden=false;
 $('mCustomerCard').innerHTML='<strong>'+esc(c.name)+'</strong><div class="meta">Customer Mobile: '+esc(c.mobile)+'<br>Job Quantity: '+esc(c.qty||'—')+'<br>NID No.: '+esc(c.nid||'—')+'<br>Contact Details: '+esc(c.contactDetails||'—')+'</div>';
 const jobs=db.works.filter(w=>digits(w.id)===mobile);
 $('mJobPicker').hidden=!jobs.length;
 $('mJobWorkspace').hidden=true;
 if(!jobs.length){$('mSearchMessage').textContent='Customer found, but no job records are saved for this customer yet.';return}
 $('mJobSelect').innerHTML='<option value="">Select Job Record</option>'+jobs.map(w=>'<option value="'+esc(w.recordNo)+'">'+esc(w.recordNo)+' · '+esc(w.category||'')+' · '+esc(w.description||'')+'</option>').join('');
}
$('mSearchBtn').onclick=findMoneyCustomer;
$('mSearchMobile').addEventListener('input',e=>{e.target.value=formatMobile(e.target.value)});
$('mSearchMobile').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();findMoneyCustomer()}};
function showMoneyJob(){
 const no=$('mJobSelect').value,w=db.works.find(x=>x.recordNo===no);
 activeMoneyJob=no;
 if(!w){$('mJobWorkspace').hidden=true;return}
 $('mJobWorkspace').hidden=false;
 const paid=Number(w.totalPayingAmount)||0,contact=Number(w.contactAmount)||0;
 $('mJobDetails').innerHTML='<strong>'+esc(w.recordNo)+' · '+esc(w.category||'')+'</strong><div class="meta">Customer: '+esc(w.customer)+' ('+esc(formatMobile(w.id))+')<br>Job Description: '+esc(w.description||'—')+'<br>Status: '+esc(w.status||'—')+'<br>Contact Amount: '+money(contact)+'</div>';
 const parts=[w.amount,w.amount2,w.amount3,w.amount4,w.amount5].map((v,i)=>Number(v)>0?((i+1)+'st/Payment '+money(v)):null).filter(Boolean);
 $('mIncomeDetails').innerHTML='<strong>Total Job Income: '+money(paid)+'</strong><div class="meta">Payment stage: '+esc(w.eip||'—')+'<br>Received Date: '+esc(w.received||'—')+'<br>Payment entries: '+(parts.length?parts.map(esc).join(' · '):'No payment received yet')+'</div>';
 $('mMutationIncome').value=money(paid);
 const expenses=db.money.filter(x=>x.type==='Expense'&&x.jobRecordNo===no);
 const totalExpense=expenses.reduce((s,x)=>s+(Number(x.amount)||0),0);
 $('mJobExpenseList').innerHTML=expenses.length?expenses.slice().reverse().map(x=>item(money(x.amount)+' · '+esc(x.category||'Expense'),esc(x.personName||'')+' ('+esc(x.personMobile||'')+') · '+esc(x.date||'')+' · '+esc(x.description||''),act('medit',x.id,'Edit')+act('mdel',x.id,'Delete','danger'))).join(''):'<div class="empty">No expenses saved for this job.</div>';
 $('mJobExpenseList').insertAdjacentHTML('beforeend','<div class="customer-result"><strong>Total Job Expenses: '+money(totalExpense)+'</strong><br><strong>Job Balance: '+money(paid-totalExpense)+'</strong></div>');
 $('mCategory').value=w.category||'';updateMoneyCategoryFields();
}
$('mJobSelect').onchange=showMoneyJob;
$('moneyForm').onsubmit=e=>{
 e.preventDefault();
 const w=db.works.find(x=>x.recordNo===activeMoneyJob);
 if(!w){alert('Search a customer and select a Job Record first.');return}
 const cat=$('mCategory').value;
 if(!cat){alert('Please select a Category.');$('mCategory').focus();return}
 const personName=$('mPersonName').value.trim(),personMobile=formatMobile($('mPersonMobile').value);
 if(!personName||!validMobile(personMobile)){alert('Enter the recipient name and a valid 11-digit mobile number.');return}
 if(['Section (144/145)','Section (150)','S.F Files'].includes(cat)&&(!$('mCaseNo').value.trim()||!$('mInvestigationDate').value)){alert('Enter Case No. and Investigation Date.');return}
 const x={id:$('moneyEdit').value||uid('TX'),type:'Expense',jobRecordNo:w.recordNo,customerMobile:formatMobile(w.id),personName,personMobile,category:cat,mutationApplicationNo:cat==='Mutation' ? $('mMutationNo').value.trim():'',caseNo:['Section (144/145)','Section (150)','S.F Files'].includes(cat)?$('mCaseNo').value.trim():'',investigationDate:['Section (144/145)','Section (150)','S.F Files'].includes(cat)?$('mInvestigationDate').value:'',rorNo:['CP (ROR)','Draft (ROR)','Search (ROR)','Corr. (ROR)'].includes(cat)?$('mRorNo').value.trim():'',mousaNo:['CP (ROR)','Draft (ROR)','Search (ROR)','Corr. (ROR)'].includes(cat)?$('mMousaNo').value.trim():'',amount:num($('mAmount').value),date:$('mDate').value,description:$('mDescription').value};
 if(!x.amount||!x.date){alert('Enter an amount and date.');return}
 const i=db.money.findIndex(y=>y.id===x.id);if(i<0)db.money.push(x);else db.money[i]=x;
 clearForm($('moneyForm'),'moneyEdit');$('mDate').value=today();$('mCategory').value=w.category||'';updateMoneyCategoryFields();showMoneyJob();save();
};
$('moneyClear').onclick=()=>{clearForm($('moneyForm'),'moneyEdit');$('mDate').value=today();$('mCategory').value=db.works.find(w=>w.recordNo===activeMoneyJob)?.category||'';updateMoneyCategoryFields()};
$('wId').onchange=()=>{
 const c=db.customers.find(x=>digits(x.mobile)===digits($('wId').value));
 if(!c){$('wCustomer').value='';$('wQty').value='';$('customerRequiredModal').hidden=false;return}
 $('wCustomer').value=c.name||'';$('wQty').value=c.qty||'';
};
$('customerRequiredOk').onclick=()=>{$('customerRequiredModal').hidden=true;showPage('customers')};
$('workForm').onsubmit=e=>{
 e.preventDefault();const id=digits($('wId').value),customer=customerName(id);
 if(!validMobile(id)||!customer){alert('Select a saved Customer Mobile (ID) first.');return}
 const payments=[1,2,3,4,5].map(n=>amountNumber($(n===1?'wAmount':'wAmount'+n).value));
 const total=payments.reduce((sum,v)=>sum+(Number(v)||0),0);
 const category=$('wCategory').value;
 const w={recordNo:$('workEdit').value||uid('JOB'),paymentSchema:2,id,customer,qty:$('wQty').value,category,mutationApplicationNo:category==='Mutation'?$('wMutationNo').value.trim():'',caseNo:['Section (144/145)','Section (150)','S.F Files'].includes(category)?$('wCaseNo').value.trim():'',investigationDate:['Section (144/145)','Section (150)','S.F Files'].includes(category)?$('wInvestigationDate').value:'',rorNo:['CP (ROR)','Draft (ROR)','Search (ROR)','Corr. (ROR)'].includes(category)?$('wRorNo').value.trim():'',mousaNo:['CP (ROR)','Draft (ROR)','Search (ROR)','Corr. (ROR)'].includes(category)?$('wMousaNo').value.trim():'',description:$('wDescription').value.trim(),contactAmount:amountNumber($('wContactAmount').value),received:$('wReceived').value,eip:$('wEip').value,amount:payments[0],amount2:payments[1],amount3:payments[2],amount4:payments[3],amount5:payments[4],deadline:$('wDeadline').value,handover:$('wHandover').value,totalPayingAmount:total,status:$('wStatus').value,reminder:$('wReminder').checked};
 if(!w.description){alert('Enter Job Description.');return}
 $('wRecordNo').value=w.recordNo;
 const i=db.works.findIndex(x=>x.recordNo===w.recordNo);if(i<0)db.works.push(w);else db.works[i]=w;
 clearForm($('workForm'),'workEdit');$('wRecordNo').value='';$('wReceived').value=today();updateJobCategoryFields();updatePaymentFields();updatePaymentTotal();refreshJobOptions();save();
};
$('workClear').onclick=()=>{clearForm($('workForm'),'workEdit');$('wRecordNo').value='';$('wReceived').value=today();$('wReminder').checked=false;updateJobCategoryFields();updatePaymentFields();updatePaymentTotal();refreshJobOptions()};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b)return;const {action,id}=b.dataset;
 if(action==='cdel'&&confirm('Delete this customer?'))db.customers=db.customers.filter(x=>digits(x.mobile)!==digits(id));
 if(action==='mdel'&&confirm('Delete this transaction?'))db.money=db.money.filter(x=>x.id!==id);
 if(action==='wdel'&&confirm('Delete this job record?'))db.works=db.works.filter(x=>x.recordNo!==id);
 if(action==='cedit'){
  const c=db.customers.find(x=>digits(x.mobile)===digits(id));if(!c)return;$('customerEdit').value=digits(c.mobile);
  [['cQty','qty'],['cMobile','mobile'],['cName','name'],['cNid','nid'],['cPassword','password'],['cContactDetails','contactDetails']].forEach(([a,k])=>$(a).value=c[k]??'');
  document.querySelector('[data-tab="customers"]').click();
 }
 if(action==='medit'){const x=db.money.find(x=>x.id===id);if(!x)return;if(!x.jobRecordNo){alert('This older transaction is not linked to a Job Record, so it cannot be edited in the new job expense form. You can still delete it or keep it in your records.');return}$('mSearchMobile').value=formatMobile(x.customerMobile);findMoneyCustomer();$('mJobSelect').value=x.jobRecordNo;showMoneyJob();$('moneyEdit').value=id;const catSelect=$('mCategory');if(x.category&&!Array.from(catSelect.options).some(o=>o.value===x.category)){const legacy=document.createElement('option');legacy.value=x.category;legacy.textContent='Existing: '+x.category;catSelect.appendChild(legacy)}[['mCategory','category'],['mPersonName','personName'],['mPersonMobile','personMobile'],['mAmount','amount'],['mDate','date'],['mDescription','description'],['mMutationNo','mutationApplicationNo'],['mCaseNo','caseNo'],['mInvestigationDate','investigationDate'],['mRorNo','rorNo'],['mMousaNo','mousaNo']].forEach(([a,k])=>$(a).value=x[k]??'');updateMoneyCategoryFields();document.querySelector('[data-tab="money"]').click()}
 if(action==='wedit'){const w=db.works.find(x=>x.recordNo===id);if(!w)return;$('workEdit').value=w.recordNo;$('wRecordNo').value=w.recordNo;refreshJobOptions(w.id);$('wId').value=digits(w.id);$('wCustomer').value=customerName(id)||w.customer;[['wQty','qty'],['wCategory','category'],['wDescription','description'],['wReceived','received'],['wEip','eip'],['wDeadline','deadline'],['wHandover','handover'],['wStatus','status'],['wMutationNo','mutationApplicationNo'],['wCaseNo','caseNo'],['wInvestigationDate','investigationDate'],['wRorNo','rorNo'],['wMousaNo','mousaNo']].forEach(([a,k])=>$(a).value=w[k]||'');updateJobCategoryFields();updatePaymentFields();const stage=w.eip||'1st Pay',legacyNo=stage==='2nd Pay'?2:stage==='3rd Pay'?3:stage==='4th Pay'?4:stage==='Final Pay'?5:1;const values=[w.amount??'',w.amount2??'',w.amount3??'',w.amount4??'',w.amount5??''];if(values.every(v=>v===''||v===null||v===undefined))values[legacyNo-1]=w.amount??'';$('wContactAmount').value=formatTaka(w.contactAmount);[1,2,3,4,5].forEach(n=>{const el=$(n===1?'wAmount':'wAmount'+n);if(el)el.value=formatTaka(values[n-1])});$('wReminder').checked=w.reminder===true;updatePaymentTotal();document.querySelector('[data-tab="work"]').click()}
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
 ['Record ID','Type','Job Record No.','Category','Amount','Customer Mobile','Person Name','Person Mobile','Mut. Appl. No.','Case No.','Investigation Date','(ROR) No.','Mousa No.','Date','Description'],
 db.money.map(x=>[x.id,x.type,x.jobRecordNo||'',x.category,x.amount,x.customerMobile||'',x.personName||'',x.personMobile||'',x.mutationApplicationNo||'',x.caseNo||'',x.investigationDate||'',x.rorNo||'',x.mousaNo||'',x.date,x.description]));
$('workCsvBtn').onclick=()=>downloadCsv('Job Details.csv',
 ['Job Record No.','Customer Mobile (Customer ID)','Customer Name','Job Category','Mut. Appl. No.','Case No.','Investigation Date','(ROR) No.','Mousa No.','Status','Job Description','Contact Amount','Received Date','EIP','1st Amount','2nd Amount','3rd Amount','4th Amount','Final Amount','Datelines','Handover','Total Paying Amount','Reminder'],
 db.works.map(x=>[x.recordNo||'',x.id,x.customer,x.category||'',x.mutationApplicationNo||'',x.caseNo||'',x.investigationDate||'',x.rorNo||'',x.mousaNo||'',x.status,x.description,x.contactAmount??'',x.received,x.eip||'',x.amount??'',x.amount2??'',x.amount3??'',x.amount4??'',x.amount5??'',x.deadline,x.handover,x.totalPayingAmount??'',x.reminder?'Yes':'No']));

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
$('moneyFilter').onchange=render;
function applyTheme(dark){document.documentElement.classList.toggle('dark',dark);$('themeBtn').textContent=dark?'☀':'☾';$('themeBtn').setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode')}
applyTheme(localStorage.getItem('iem-dark')==='1');$('themeBtn').onclick=()=>{const dark=!document.documentElement.classList.contains('dark');localStorage.setItem('iem-dark',dark?'1':'0');applyTheme(dark)};
$('exportBtn').onclick=()=>{const a=document.createElement('a'),blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});a.href=URL.createObjectURL(blob);a.download='income-expense-backup-'+today()+'.json';a.click();URL.revokeObjectURL(a.href)};
$('importFile').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;const x=JSON.parse(await f.text());if(!Array.isArray(x.customers)||!Array.isArray(x.money)||!Array.isArray(x.works))throw Error();if(confirm('Replace current records with this backup?')){db=x;save();alert('Backup restored.')}}catch{alert('Invalid backup file.')}e.target.value=''};
$('clearAll').onclick=()=>{if(confirm('Permanently delete all records stored in this browser?')){db={customers:[],money:[],works:[]};save()}};
$('notifyBtn').onclick=async()=>{if(!('Notification'in window)){alert('Notifications are not supported by this browser.');return}const p=await Notification.requestPermission();alert(p==='granted'?'Browser notifications enabled. Open the app to review reminders.':'Notification permission was not granted.')};
$('mDate').value=$('wReceived').value=today();updateMoneyCategoryFields();refreshJobOptions();updateJobCategoryFields();updatePaymentFields();updatePaymentTotal();render();
})();