import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {offer,answer,finish,encrypt,decrypt,random,unb64,utf8} from './crypto.js';
import {database,readRecord,passwordKey,seal,unseal,compareAndSwap} from './storage.js';
const $=id=>document.getElementById(id);
let db,key,salt,state,revision=0,exists=false,locked=true,busy=false,epoch=0,pending=null,candidate=null,mode='text',idleTimer,toastTimer,stream,frame,scanTarget,deleteId,installPrompt;
const names={encrypt:'Зашифровать',decrypt:'Расшифровать',contacts:'Контакты',pair:'Обмен ключами',security:'Безопасность',help:'Как это работает'};
function notify(message,error=false){$('toast').textContent=message;$('toast').classList.toggle('error',error);$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,error?9000:4500);}
function touch(){clearTimeout(idleTimer);if(!locked)idleTimer=setTimeout(lock,300000);}
for(const event of ['pointerdown','keydown','input'])document.addEventListener(event,touch,{passive:true});
function resetPair(){pending?.priv?.fill(0);pending=null;candidate=null;for(const id of ['offer-output','answer-output','offer-input','answer-input','contact-name'])$(id).value='';for(const id of ['offer-box','answer-box','verification'])$(id).hidden=true;$('fingerprint').textContent='';$('fingerprint-confirmed').checked=false;}
function clearPlaintext(){$('plaintext').value='';$('cipher-input').value='';$('cipher-output').value='';$('decrypted-text').textContent='';$('encrypt-result').hidden=true;$('encrypt-empty').hidden=false;$('decrypted-result').hidden=true;$('decrypt-placeholder').hidden=false;$('byte-count').textContent='0 / 4096 Б';}
function gate(){
  $('gate').hidden=false;$('shell').inert=true;
  $('gate-title').innerHTML=exists?'С возвращением<br>в AUSFIG X.':'Ваше пространство<br>приватности.';
  $('gate-description').textContent=exists?'Введите парольную фразу, чтобы открыть локальное хранилище этого браузера.':'Создайте локальный профиль. Он будет хранить контакты и ключи в этом браузере под вашим паролем.';
  $('password-label').textContent=exists?'Парольная фраза':'Придумайте парольную фразу';
  $('vault-password').autocomplete=exists?'current-password':'new-password';$('confirm-password-wrap').hidden=exists;$('vault-confirm').required=!exists;
  $('unlock-submit').textContent=exists?'Разблокировать':'Создать пространство';
  $('gate-note').textContent=exists?'Пароль не отправляется на сервер. Сброса пароля нет.':'Сохраните пароль в надёжном месте. Сброса пароля нет.';
}
function lock(){
  epoch++;locked=true;key=null;salt=null;state=null;clearTimeout(idleTimer);clearPlaintext();resetPair();stopScan();
  for(const d of document.querySelectorAll('dialog'))d.close();
  $('contacts-list').replaceChildren();$('recipient').replaceChildren();$('sender').replaceChildren();$('vault-password').value='';$('vault-confirm').value='';gate();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!locked)lock();});
window.addEventListener('pagehide',()=>{if(!locked)lock();});
async function run(fn){
  if(busy)return;if(locked)throw Error('Разблокируйте приложение.');busy=true;const e=epoch;
  document.body.setAttribute('aria-busy','true');
  try{await fn(e);}catch(err){if(!locked)notify(err.message||'Операция не выполнена.',true);}
  finally{busy=false;document.body.removeAttribute('aria-busy');}
}
async function commit(next,e){
  if(locked||epoch!==e)throw Error('Приложение заблокировано.');
  const record=await seal(key,next,salt,revision+1);
  if(locked||epoch!==e)throw Error('Приложение заблокировано.');
  try{await compareAndSwap(db,record,revision);}catch(err){lock();notify(err.message,true);throw err;}
  if(locked||epoch!==e)throw Error('Приложение заблокировано.');
  state=next;revision=record.revision;renderContacts();
}
$('unlock-form').addEventListener('submit',async ev=>{
  ev.preventDefault();if(busy)return;busy=true;const button=$('unlock-submit');button.disabled=true;button.textContent='Открываем хранилище…';
  const attempt=++epoch;
  try{
    if(!db)throw Error('Хранилище недоступно. Откройте приложение по HTTPS в обычном режиме браузера.');
    const password=$('vault-password').value;
    if(!exists&&password!==$('vault-confirm').value)throw Error('Парольные фразы не совпадают.');
    if(password.length<12)throw Error('Нужно не менее 12 символов.');
    const record=await readRecord(db), nextSalt=record?unb64(record.salt):random(16);
    const nextKey=await passwordKey(password,nextSalt);let nextState;
    if(record){try{nextState=await unseal(record,nextKey);}catch{throw Error('Неверный пароль или повреждено хранилище.');}}
    else{nextState={version:1,contacts:[]};await compareAndSwap(db,await seal(nextKey,nextState,nextSalt,1),0);}
    if(document.hidden||attempt!==epoch)throw Error('Повторите разблокировку.');
    key=nextKey;salt=nextSalt;state=nextState;revision=record?.revision??1;locked=false;exists=true;
    $('vault-password').value='';$('vault-confirm').value='';$('gate').hidden=true;$('shell').inert=false;renderContacts();touch();
  }catch(err){notify(err.message||'Не удалось открыть хранилище.',true);}
  finally{busy=false;button.disabled=false;button.textContent=exists?'Разблокировать':'Создать пространство';}
});
function page(name){if(!names[name])name='encrypt';for(const p of document.querySelectorAll('.page'))p.hidden=p.id!==`page-${name}`;for(const b of document.querySelectorAll('[data-page]')){b.classList.toggle('active',b.dataset.page===name);b.setAttribute('aria-current',b.dataset.page===name?'page':'false');}$('crumb-title').textContent=names[name];if(location.hash!==`#${name}`)history.replaceState(null,'',`#${name}`);}
for(const b of document.querySelectorAll('[data-page],[data-go]'))b.addEventListener('click',()=>page(b.dataset.page||b.dataset.go));
window.addEventListener('hashchange',()=>page(location.hash.slice(1)));page(location.hash.slice(1));
$('lock-button').onclick=lock;$('security-lock').onclick=lock;
function setMode(next){mode=next;for(const m of ['text','command']){$(`mode-${m}`).classList.toggle('selected',m===mode);$(`mode-${m}`).setAttribute('aria-pressed',String(m===mode));$(`${m}-fields`).hidden=m!==mode;}}
$('mode-text').onclick=()=>setMode('text');$('mode-command').onclick=()=>setMode('command');$('command').onchange=()=>{$('time-field').hidden=$('command').value!=='5';};
function clearCipherResult(){$('cipher-output').value='';$('encrypt-result').hidden=true;$('encrypt-empty').hidden=false;}
$('recipient').onchange=clearCipherResult;
$('sender').onchange=()=>{$('decrypted-text').textContent='';$('decrypted-result').hidden=true;$('decrypt-placeholder').hidden=false;};
$('plaintext').oninput=()=>{clearCipherResult();$('byte-count').textContent=`${utf8($('plaintext').value).length} / 4096 Б`;};
function selected(id){const c=state.contacts.find(c=>c.id===$(id).value);if(!c)throw Error('Сначала добавьте доверенный контакт.');return c;}
function replaceContact(nextContact){const next=structuredClone(state);next.contacts=next.contacts.map(c=>c.id===nextContact.id?nextContact:c);return next;}
$('encrypt-form').onsubmit=ev=>{ev.preventDefault();run(async e=>{
  $('encrypt-result').hidden=true;$('encrypt-empty').hidden=false;
  const result=encrypt(selected('recipient'),$('plaintext').value,mode==='command'?{command:Number($('command').value),time:$('command-time').value}:{});
  await commit(replaceContact(result.contact),e);
  $('cipher-output').value=result.code;$('cipher-length').textContent=`${result.code.length} символов · ${mode==='command'?'короткая команда':'обычный текст'}`;
  $('encrypt-empty').hidden=true;$('encrypt-result').hidden=false;$('plaintext').value='';$('byte-count').textContent='0 / 4096 Б';notify('Код готов к передаче.');
});};
$('decrypt-form').onsubmit=ev=>{ev.preventDefault();run(async e=>{
  $('decrypted-text').textContent='';$('decrypted-result').hidden=true;$('decrypt-placeholder').hidden=false;
  const result=decrypt(selected('sender'),$('cipher-input').value);await commit(replaceContact(result.contact),e);
  $('decrypted-text').textContent=result.text;$('decrypt-placeholder').hidden=true;$('decrypted-result').hidden=false;$('cipher-input').value='';notify('Подлинность сообщения проверена.');
});};
$('clear-decrypted').onclick=()=>{$('decrypted-text').textContent='';$('decrypted-result').hidden=true;$('decrypt-placeholder').hidden=false;};
async function copy(id){try{await navigator.clipboard.writeText($(id).value);notify('Код скопирован.');}catch{$(id).focus();$(id).select();notify('Выделите и скопируйте код вручную.',true);}}
for(const [button,field] of [['copy-cipher','cipher-output'],['copy-offer','offer-output'],['copy-answer','answer-output']])$(button).onclick=()=>copy(field);
async function showQR(id){try{const text=$(id).value;if(text.length>1800)throw Error('Код слишком большой для удобного QR. Передайте его текстом или файлом.');if(!text)throw Error('Сначала создайте код.');const e=epoch;await QRCode.toCanvas($('qr-canvas'),text,{errorCorrectionLevel:'M',margin:3,width:360,color:{dark:'#0c1114',light:'#ffffff'}});if(!locked&&epoch===e)$('qr-dialog').showModal();}catch(e){notify(e.message,true);}}
for(const [button,field] of [['qr-cipher','cipher-output'],['qr-offer','offer-output'],['qr-answer','answer-output']])$(button).onclick=()=>showQR(field);
$('close-qr').onclick=()=>$('qr-dialog').close();
$('download-cipher').onclick=()=>{const a=document.createElement('a');const u=URL.createObjectURL(new Blob([$('cipher-output').value],{type:'text/plain;charset=utf-8'}));a.href=u;a.download='AUSFIG-X-message.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
function renderContacts(){
  const contacts=state.contacts;$('contact-count').textContent=contacts.length;
  for(const id of ['recipient','sender']){const select=$(id),prior=select.value;select.replaceChildren();const placeholder=new Option(contacts.length?'Выберите контакт':'Добавьте доверенный контакт','');select.append(placeholder);for(const c of contacts)select.append(new Option(c.name,c.id));select.value=contacts.some(c=>c.id===prior)?prior:contacts.length===1?contacts[0].id:'';}
  $('recipient-hint').textContent=contacts.length?'Только собеседник с подтверждённым сеансом сможет прочитать сообщение.':'Для первого сообщения обменяйтесь ключами с собеседником.';
  const list=$('contacts-list');list.replaceChildren();
  if(!contacts.length){const box=document.createElement('div');box.className='panel empty-contacts';box.innerHTML='<svg><use href="#i-users"/></svg><h2>Здесь будут ваши собеседники</h2><p>Добавьте первый контакт через обмен ключами.</p><button class="button primary">Добавить контакт</button>';box.querySelector('button').onclick=()=>page('pair');list.append(box);return;}
  for(const c of contacts){const card=document.createElement('article');card.className='panel contact-card';const avatar=document.createElement('div');avatar.className='avatar';avatar.textContent=Array.from(c.name)[0]?.toUpperCase()||'•';const info=document.createElement('div');info.className='contact-info';const title=document.createElement('h2');title.textContent=c.name;const stat=document.createElement('p');stat.textContent=`Проверен · Исходящих: ${c.send.n} · Сеанс ${c.id.slice(0,8)}`;const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Отпечаток сеанса';const code=document.createElement('code');code.textContent=c.fingerprint.match(/.{1,4}/g).join(' ');details.append(summary,code);info.append(title,stat,details);const actions=document.createElement('div');actions.className='contact-actions';const send=document.createElement('button');send.className='button secondary';send.textContent='Написать';send.onclick=()=>{$('recipient').value=c.id;page('encrypt');};const remove=document.createElement('button');remove.className='button ghost';remove.textContent='Удалить';remove.onclick=()=>{deleteId=c.id;$('delete-dialog').showModal();};actions.append(send,remove);card.append(avatar,info,actions);list.append(card);}
}
$('cancel-delete').onclick=()=>$('delete-dialog').close();$('confirm-delete').onclick=()=>run(async e=>{const next=structuredClone(state);next.contacts=next.contacts.filter(c=>c.id!==deleteId);await commit(next,e);$('delete-dialog').close();clearPlaintext();notify('Контакт и ключи сеанса удалены.');});
function pairTab(join){resetPair();$('pair-create').hidden=join;$('pair-join').hidden=!join;for(const [id,on] of [['pair-create-tab',!join],['pair-join-tab',join]]){$(id).classList.toggle('selected',on);$(id).setAttribute('aria-pressed',String(on));}}
$('pair-create-tab').onclick=()=>pairTab(false);$('pair-join-tab').onclick=()=>pairTab(true);
function verification(c){candidate=c;$('fingerprint').textContent=c.fingerprint.match(/.{1,4}/g).join(' ');$('verification').hidden=false;$('fingerprint-confirmed').checked=false;}
$('create-offer').onclick=()=>run(async()=>{resetPair();pending=offer();$('offer-output').value=pending.code;$('offer-box').hidden=false;});
$('answer-offer').onclick=()=>run(async()=>{const result=answer($('offer-input').value);$('answer-output').value=result.code;$('answer-box').hidden=false;verification(result.contact);});
$('finish-offer').onclick=()=>run(async()=>{if(!pending)throw Error('Создайте новое приглашение.');verification(finish(pending,$('answer-input').value));pending=null;});
$('confirm-contact').onsubmit=ev=>{ev.preventDefault();run(async e=>{
  if(!candidate||!$('fingerprint-confirmed').checked)throw Error('Сначала сверьте отпечаток.');
  const name=$('contact-name').value.trim();if(!name)throw Error('Введите имя контакта.');
  if(state.contacts.length>=100)throw Error('Достигнут лимит 100 контактов.');
  if(state.contacts.some(c=>c.id===candidate.id))throw Error('Этот сеанс уже сохранён.');
  const next=structuredClone(state);next.contacts.push({...candidate,name});await commit(next,e);resetPair();page('contacts');notify('Контакт сохранён. Убедитесь, что собеседник тоже подтвердил сеанс.');
});};
function stopScan(){cancelAnimationFrame(frame);stream?.getTracks().forEach(t=>t.stop());stream=null;$('scan-video').srcObject=null;}
async function scan(target){
  const e=epoch;try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Камера недоступна. Вставьте код вручную.');scanTarget=target;
    const nextStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:640},height:{ideal:480}},audio:false});
    if(locked||epoch!==e){nextStream.getTracks().forEach(t=>t.stop());return;}stream=nextStream;const video=$('scan-video');video.srcObject=stream;$('scan-dialog').showModal();await video.play();const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});let last=0;
    function read(now){if(!stream)return;if(now-last>180&&video.readyState>=2){last=now;canvas.width=video.videoWidth;canvas.height=video.videoHeight;ctx.drawImage(video,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height);const result=jsQR(data.data,data.width,data.height,{inversionAttempts:'dontInvert'});if(result){if(result.data.length>$(scanTarget).maxLength){stopScan();$('scan-dialog').close();notify('QR-код слишком длинный.',true);return;}$(scanTarget).value=result.data;stopScan();$('scan-dialog').close();notify('Код считан.');return;}}frame=requestAnimationFrame(read);}frame=requestAnimationFrame(read);
  }catch{stopScan();$('scan-dialog').close();notify('Не удалось открыть камеру. Разрешите доступ или вставьте код вручную.',true);}
}
$('scan-message').onclick=()=>scan('cipher-input');$('scan-offer').onclick=()=>scan('offer-input');$('scan-answer').onclick=()=>scan('answer-input');$('close-scan').onclick=()=>{$('scan-dialog').close();stopScan();};$('scan-dialog').addEventListener('close',stopScan);$('scan-dialog').addEventListener('cancel',stopScan);
window.addEventListener('beforeinstallprompt',ev=>{ev.preventDefault();installPrompt=ev;$('install-button').textContent='Установить AUSFIG X';});
$('install-button').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;}else notify('Android / ПК: меню браузера → Установить. iPhone: Поделиться → На экран Домой.');};
async function offline(){
  if(!('serviceWorker' in navigator)){setOffline(false);return;}
  try{await navigator.serviceWorker.register('./sw.js',{scope:'./'});const reg=await navigator.serviceWorker.ready;setOffline(!!reg.active);}catch{setOffline(false);}
}
function setOffline(ok){$('cache-detail').textContent=ok?'Ресурсы сохранены в браузере. Доступны до очистки данных.':'Не удалось сохранить офлайн-ресурсы. Пока требуется подключение.';$('cache-tag').textContent=ok?'Готово без сети':'Не готовы';}
try{if(!isSecureContext)throw Error('Откройте приложение по HTTPS или localhost.');db=await database();exists=!!await readRecord(db);gate();offline();}catch(err){gate();$('unlock-submit').disabled=true;notify(err.message||'Не удалось открыть хранилище.',true);}
