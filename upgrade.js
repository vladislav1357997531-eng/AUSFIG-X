import {encryptQuick,decryptQuick} from './quick-crypto.js';
const el=id=>document.getElementById(id);
const html=[
'<dialog id="quick-dialog" class="quick-dialog" aria-labelledby="quick-heading">',
'<div class="quick-head"><div><small>AUSFIG X · БЕЗ КОНТАКТА</small><h2 id="quick-heading">Быстрое шифрование</h2></div><button type="button" class="button ghost" id="quick-close">Закрыть ×</button></div>',
'<div class="quick-tabs"><button id="quick-encrypt-tab" class="selected" type="button">Зашифровать</button><button id="quick-decrypt-tab" type="button">Расшифровать</button></div>',
'<form id="quick-form" autocomplete="off"><label for="quick-input" id="quick-input-label">Текст сообщения</label>',
'<textarea id="quick-input" rows="5" spellcheck="false" required placeholder="Введите сообщение…"></textarea><p id="quick-length" class="quick-length">До 4096 байт · только на устройстве</p>',
'<label for="quick-password">Пароль для сообщения</label><div class="quick-password-row"><input id="quick-password" type="password" minlength="12" autocomplete="new-password" required placeholder="Не менее 12 символов">',
'<button class="button ghost" id="quick-show" type="button">Показать</button></div>',
'<p class="quick-tip">Передавай пароль собеседнику отдельно от кода. Не используй пароль от хранилища AUSFIG X. Слабый пароль можно подобрать.</p>',
'<button class="button primary wide" id="quick-submit" type="submit">Зашифровать текст</button></form>',
'<div id="quick-result" hidden><label for="quick-output" id="quick-result-label">Готовый код</label><textarea id="quick-output" spellcheck="false" rows="4" readonly></textarea>',
'<div class="quick-actions"><button type="button" id="quick-copy" class="button secondary">Копировать</button><button type="button" id="quick-reset" class="button ghost">Новое сообщение</button></div></div>',
'<p class="quick-error" id="quick-error" hidden role="alert"></p><p class="quick-footer">AES-256-GCM · PBKDF2-SHA256 · без сохранения текста и пароля</p></dialog>',
'<nav class="mobile-dock" aria-label="Навигация">',
'<button type="button" data-mobile-page="encrypt"><svg><use href="#i-lock"/></svg><span>Текст</span></button>',
'<button type="button" data-mobile-page="decrypt"><svg><use href="#i-unlock"/></svg><span>Прочитать</span></button>',
'<button type="button" data-mobile-page="contacts"><svg><use href="#i-users"/></svg><span>Контакты</span></button>',
'<button type="button" id="mobile-more-button" aria-expanded="false"><svg><use href="#i-plus"/></svg><span>Ещё</span></button></nav>',
'<div id="mobile-more" class="mobile-more" hidden><button type="button" data-mobile-page="pair">Обмен ключами</button><button type="button" data-mobile-page="security">Безопасность</button><button type="button" data-mobile-page="help">Помощь</button><button type="button" id="mobile-quick">Шифровать без контакта</button></div>'
].join('');
document.body.insertAdjacentHTML('beforeend',html);
const dialog=el('quick-dialog'),more=el('mobile-more');let action='encrypt',busy=false;
function clear(){el('quick-password').value='';el('quick-input').value='';el('quick-output').value='';el('quick-result').hidden=true;el('quick-error').hidden=true;el('quick-password').type='password';el('quick-show').textContent='Показать';}
function setAction(next){action=next;clear();el('quick-input-label').textContent=next==='encrypt'?'Текст сообщения':'Зашифрованный код Q1:';el('quick-input').placeholder=next==='encrypt'?'Введите сообщение…':'Вставьте код Q1:…';el('quick-input').maxLength=next==='encrypt'?4096:5650;el('quick-length').textContent=next==='encrypt'?'До 4096 байт · только на устройстве':'Контакт для кода Q1: не нужен';el('quick-submit').textContent=next==='encrypt'?'Зашифровать текст':'Расшифровать код';el('quick-result-label').textContent=next==='encrypt'?'Готовый код':'Расшифрованный текст';for(const type of ['encrypt','decrypt']){const b=el('quick-'+type+'-tab');b.classList.toggle('selected',type===next);b.setAttribute('aria-pressed',String(type===next));}}
function open(next){if(busy)return;setAction(next);more.hidden=true;el('mobile-more-button').setAttribute('aria-expanded','false');if(!dialog.open)dialog.showModal();}
function button(parent,label,fn){const b=document.createElement('button');b.type='button';b.className='button secondary quick-entry';b.textContent=label;b.onclick=fn;parent.append(b);}
const gate=el('unlock-form');if(gate)button(gate.parentElement,'Без контакта · зашифровать текст',()=>open('encrypt'));
function addBanner(form,headline,description,label,next){if(!form)return;const b=document.createElement('div');b.className='quick-banner';const text=document.createElement('div');const heading=document.createElement('strong');heading.textContent=headline;const sub=document.createElement('span');sub.textContent=description;text.append(heading,sub);b.append(text);button(b,label,()=>open(next));form.before(b);}
addBanner(el('encrypt-form'),'Нет доверенного контакта?','Можно зашифровать текст по отдельному паролю.','Зашифровать без контакта','encrypt');
addBanner(el('decrypt-form'),'Получили код Q1:?','Он открывается без создания контакта.','Расшифровать по паролю','decrypt');
el('quick-close').onclick=()=>{if(!busy)dialog.close();};
dialog.addEventListener('close',clear);
el('quick-encrypt-tab').onclick=()=>{if(!busy)setAction('encrypt');};
el('quick-decrypt-tab').onclick=()=>{if(!busy)setAction('decrypt');};
el('quick-reset').onclick=()=>setAction(action);
el('quick-show').onclick=()=>{const p=el('quick-password');p.type=p.type==='password'?'text':'password';el('quick-show').textContent=p.type==='password'?'Показать':'Скрыть';};
el('quick-copy').onclick=async()=>{const field=el('quick-output');try{await navigator.clipboard.writeText(field.value);el('quick-copy').textContent='Скопировано ✓';setTimeout(()=>el('quick-copy').textContent='Копировать',2500);}catch{field.focus();field.select();el('quick-copy').textContent='Выделено — скопируй';}};
el('quick-input').oninput=()=>{el('quick-result').hidden=true;if(action==='encrypt')el('quick-length').textContent=new TextEncoder().encode(el('quick-input').value).length+' / 4096 байт';};
el('quick-form').onsubmit=async event=>{event.preventDefault();if(busy)return;busy=true;const submit=el('quick-submit');submit.disabled=true;submit.textContent='Шифруем…';el('quick-error').hidden=true;el('quick-result').hidden=true;try{const input=el('quick-input').value,pass=el('quick-password').value;const out=action==='encrypt'?await encryptQuick(input,pass):await decryptQuick(input,pass);el('quick-output').value=out;el('quick-result').hidden=false;el('quick-password').value='';if(action==='encrypt')el('quick-input').value='';}catch(error){el('quick-error').textContent=error.message||'Не удалось выполнить операцию.';el('quick-error').hidden=false;}finally{busy=false;submit.disabled=false;submit.textContent=action==='encrypt'?'Зашифровать текст':'Расшифровать код';}};
function markNav(){const active=location.hash.slice(1)||'encrypt';for(const b of document.querySelectorAll('[data-mobile-page]')){const yes=b.dataset.mobilePage===active;b.classList.toggle('active',yes);b.setAttribute('aria-current',yes?'page':'false');}}
el('mobile-more-button').onclick=()=>{more.hidden=!more.hidden;el('mobile-more-button').setAttribute('aria-expanded',String(!more.hidden));};
el('mobile-quick').onclick=()=>open('encrypt');
for(const b of document.querySelectorAll('[data-mobile-page]'))b.onclick=()=>{more.hidden=true;el('mobile-more-button').setAttribute('aria-expanded','false');document.querySelector('[data-page="'+b.dataset.mobilePage+'"]')?.click();markNav();};
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',markNav));window.addEventListener('hashchange',markNav);markNav();
