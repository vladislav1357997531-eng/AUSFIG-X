import {encryptQuick,decryptQuick,normalizeQuickCode} from './quick-crypto.js';
const $=id=>document.getElementById(id);
const root=document.createElement('div');root.id='public-app';root.setAttribute('aria-label','Шифрование сообщений без входа');
root.innerHTML=`<div class="p4-wrap"><header class="p4-header"><a class="p4-logo" href="#" id="p4-home">AUSFIG <b>X</b></a><span class="p4-caption">Приватные сообщения</span><button id="p4-login" class="p4-outline" type="button">Доверенные контакты →</button></header>
<main class="p4-main"><div class="p4-intro"><span class="p4-eyebrow">Шифрование без регистрации</span><h1>Сообщения под вашим контролем.</h1><p>Напишите текст и задайте пароль. Для обычных сообщений вход не нужен.</p></div>
<section class="p4-card"><div class="p4-tabs"><button id="p4-encrypt-tab" type="button" class="selected" aria-selected="true">Зашифровать</button><button id="p4-decrypt-tab" type="button" aria-selected="false">Расшифровать</button></div>
<form id="p4-form" autocomplete="off"><label id="p4-text-label" for="p4-text">Ваше сообщение</label><textarea id="p4-text" rows="6" spellcheck="false" required placeholder="Введите текст сообщения…"></textarea><div class="p4-input-tools"><span id="p4-size">0 / 4096 байт</span><button id="p4-paste" class="p4-link" type="button" hidden>Вставить код</button></div>
<label for="p4-pass">Пароль для этого сообщения</label><div class="p4-pass-line"><input type="password" id="p4-pass" required maxlength="256" autocomplete="off" placeholder="Любой непустой пароль"><button id="p4-reveal" type="button" class="p4-outline">Показать</button></div><button id="p4-generate" type="button" class="p4-link">Сгенерировать стойкий пароль</button>
<p class="p4-tip">Передавайте пароль отдельно от сообщения. Можно использовать пароль любой длины, но короткий пароль легче подобрать. Сохраните его до шифрования: после операции поле очистится.</p><button id="p4-action" type="submit" class="p4-primary">Зашифровать сообщение</button></form>
<div id="p4-result" class="p4-result" hidden><label id="p4-output-label" for="p4-output">Код для отправки</label><textarea id="p4-output" rows="5" readonly spellcheck="false"></textarea><div class="p4-result-actions"><button id="p4-copy" type="button" class="p4-primary">Копировать код</button><button id="p4-share" type="button" class="p4-outline">Поделиться</button></div></div><p id="p4-error" class="p4-error" role="alert" hidden></p></section>
<div class="p4-note">Контакты и ключи хранятся только на вашем устройстве. Для доверенных контактов войдите в локальный профиль.</div></main></div>`;
document.body.append(root);
let mode='encrypt',busy=false,operationId=0;
function message(text,isError=false){const e=$('p4-error');e.textContent=text;e.hidden=!text;e.classList.toggle('error',isError);}
function clearPublicSensitive(){
 operationId++;
 $('p4-text').value='';
 const pass=$('p4-pass');pass.value='';pass.type='password';
 $('p4-reveal').textContent='Показать';
 $('p4-result').hidden=true;
 $('p4-output').value='';
 message('');
 $('p4-size').textContent=mode==='encrypt'?'0 / 4096 байт':'Код Q1: от собеседника';
}
function reset(){if(busy)return;clearPublicSensitive();}
function selectMode(next){if(busy)return;mode=next;reset();const enc=next==='encrypt';$('p4-encrypt-tab').classList.toggle('selected',enc);$('p4-decrypt-tab').classList.toggle('selected',!enc);$('p4-encrypt-tab').setAttribute('aria-selected',String(enc));$('p4-decrypt-tab').setAttribute('aria-selected',String(!enc));$('p4-text-label').textContent=enc?'Ваше сообщение':'Зашифрованный код Q1:';$('p4-text').placeholder=enc?'Введите текст сообщения…':'Вставьте код из Telegram…';$('p4-action').textContent=enc?'Зашифровать сообщение':'Расшифровать сообщение';$('p4-paste').hidden=enc;$('p4-text').maxLength=enc?4096:7000;}
$('p4-encrypt-tab').onclick=()=>selectMode('encrypt');$('p4-decrypt-tab').onclick=()=>selectMode('decrypt');$('p4-home').onclick=e=>{e.preventDefault();selectMode('encrypt');};
$('p4-reveal').onclick=()=>{const p=$('p4-pass');p.type=p.type==='password'?'text':'password';$('p4-reveal').textContent=p.type==='password'?'Показать':'Скрыть';};
$('p4-generate').onclick=()=>{
 const bytes=crypto.getRandomValues(new Uint8Array(18));
 const password=btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const p=$('p4-pass');p.value=password;p.type='text';
 $('p4-reveal').textContent='Скрыть';
 message('Пароль создан. Скопируйте и сохраните его до шифрования; передайте отдельно от кода.');
};
$('p4-text').addEventListener('input',()=>{const val=$('p4-text').value;$('p4-result').hidden=true;message('');if(mode==='encrypt')$('p4-size').textContent=new TextEncoder().encode(val).length+' / 4096 байт';});
$('p4-paste').onclick=async()=>{try{if(!navigator.clipboard?.readText)throw Error('No clipboard read');$('p4-text').value=await navigator.clipboard.readText();$('p4-text').dispatchEvent(new Event('input'));$('p4-text').focus();}catch{message('Разрешите доступ к буферу обмена или нажмите на поле и выберите «Вставить».',true);$('p4-text').focus();}};
$('p4-form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const op=++operationId;const b=$('p4-action');b.disabled=true;message('');$('p4-result').hidden=true;
try{b.textContent='Обработка…';const pass=$('p4-pass').value,value=$('p4-text').value;const result=mode==='encrypt'?await encryptQuick(value,pass):await decryptQuick(value,pass);if(op!==operationId)return;$('p4-output').value=result;$('p4-output-label').textContent=mode==='encrypt'?'Готовый код Q1:':'Расшифрованное сообщение';$('p4-copy').textContent=mode==='encrypt'?'Копировать код':'Копировать текст';$('p4-share').hidden=mode!=='encrypt';$('p4-result').hidden=false;$('p4-pass').value='';if(mode==='encrypt'){$('p4-text').value='';$('p4-size').textContent='0 / 4096 байт';}else $('p4-text').value=normalizeQuickCode(value);}
catch(err){if(op===operationId)message(err?.message||'Не удалось обработать сообщение.',true);}finally{busy=false;b.disabled=false;b.textContent=mode==='encrypt'?'Зашифровать сообщение':'Расшифровать сообщение';}};
async function copyText(value){try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(value);return true;}catch{const el=$('p4-output');el.focus();el.select();try{return document.execCommand('copy');}catch{return false;}}}
$('p4-copy').onclick=async()=>{const ok=await copyText($('p4-output').value);message(ok?'Скопировано. Отправьте пароль отдельно.':'Текст выделен — скопируйте вручную.',!ok);};
$('p4-share').onclick=async()=>{const value=$('p4-output').value;try{if(!navigator.share)throw Error('No share');await navigator.share({text:value,title:'AUSFIG X — зашифрованное сообщение'});}catch(e){if(e.name!=='AbortError'){const ok=await copyText(value);message(ok?'Код скопирован — его можно вставить в Telegram.':'Выделите код и скопируйте вручную.',!ok);}}};

function publicView(){
 clearPublicSensitive();
 document.body.classList.add('p4-public');
 root.hidden=false;
 $('gate').hidden=true;
 $('shell').setAttribute('aria-hidden','true');
 $('shell').inert=true;
}
function contactsView(){
 clearPublicSensitive();
 document.body.classList.remove('p4-public');
 root.hidden=true;
 $('gate').hidden=true;
 $('shell').removeAttribute('aria-hidden');
 $('shell').inert=false;
 document.querySelector('[data-page="contacts"]')?.click();
}
let privateLoading=false, privateReady=false;
$('p4-login').onclick=async()=>{
 if(privateLoading)return;
 clearPublicSensitive();
 privateLoading=true;
 const button=$('p4-login'),label=button.textContent;
 button.disabled=true;button.textContent='Открываем контакты…';
 message('');
 try{
  if(!privateReady){
   await import('./app.js?v=10');
   await import('./private-contacts-v5.js?v=10');
   document.addEventListener('ausfig:unlocked',contactsView);
   document.addEventListener('ausfig:locked',publicView);
   privateReady=true;
  }
  root.hidden=true;
  $('gate').hidden=false;
  let back=$('p4-back');
  if(!back){
   back=document.createElement('button');
   back.type='button';back.id='p4-back';back.className='p4-outline';
   back.textContent='← К обычному шифрованию';
   back.onclick=()=>{
    $('vault-password').value='';
    $('vault-confirm').value='';
    publicView();
   };
   $('gate').querySelector('.gate-card')?.prepend(back);
  }
  $('vault-password').focus();
 }catch(error){
  root.hidden=false;
  $('gate').hidden=true;
  message('Не удалось открыть контакты. Проверьте интернет и попробуйте снова.',true);
 }finally{privateLoading=false;button.disabled=false;button.textContent=label;}
};
publicView();
document.addEventListener('visibilitychange',()=>{
 if(document.hidden&&(mode==='decrypt'||$('p4-text').value||$('p4-pass').value))clearPublicSensitive();
});
document.getElementById('p4-startup')?.remove();
if('serviceWorker' in navigator){
 window.addEventListener('load',()=>{
  const register=()=>navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>{});
  if('requestIdleCallback' in window)requestIdleCallback(register,{timeout:1800});
  else setTimeout(register,300);
 },{once:true});
}
