import {encryptQuick,decryptQuick} from './quick-crypto.js';
const $=id=>document.getElementById(id);
const contacts=$('page-contacts'),main=$('main'),encrypt=$('page-encrypt'),decrypt=$('page-decrypt');
if(!contacts||!main||!encrypt||!decrypt)throw Error('Невозможно загрузить разделы AUSFIG X.');
const workspace=document.createElement('section');workspace.className='contact-workspace panel';
workspace.innerHTML='<div class="contact-workspace-heading"><h2>Сообщения доверенным контактам</h2><p>Шифрование и расшифровка с подтверждёнными собеседниками.</p></div><div class="contact-mode-tabs"><button id="contact-encrypt-tab" type="button" class="selected" aria-pressed="true">Зашифровать контакту</button><button id="contact-decrypt-tab" type="button" aria-pressed="false">Расшифровать от контакта</button></div><div id="contact-pane"></div>';
contacts.append(workspace);
for(const [section,kind] of [[encrypt,'encrypt'],[decrypt,'decrypt']]){
 section.classList.remove('page');section.classList.add('contact-operation','contact-operation-'+kind);
 section.querySelectorAll('.quick-banner').forEach(b=>b.remove());
 $('contact-pane').append(section);
}
function contactMode(mode){let isEncrypt=mode!=='decrypt';encrypt.hidden=!isEncrypt;decrypt.hidden=isEncrypt;
 for(const [id,yes] of [['contact-encrypt-tab',isEncrypt],['contact-decrypt-tab',!isEncrypt]]){const b=$(id);b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));}}
$('contact-encrypt-tab').onclick=()=>contactMode('encrypt');
$('contact-decrypt-tab').onclick=()=>contactMode('decrypt');
document.addEventListener('ausfig-contact-pane',event=>contactMode(event.detail));contactMode('encrypt');
function quickPage(id,title,description,inputLabel,placeholder,resultLabel,action){
 const s=document.createElement('section');s.className='page v3-page';s.id='page-'+id;s.hidden=true;
 s.innerHTML='<div class="page-heading"><div class="eyebrow">БЕЗ ДОВЕРЕННОГО КОНТАКТА</div><h1>'+title+'<span class="mint">.</span></h1><p class="subtitle">'+description+'</p></div>'+
 '<div class="panel padded v3-panel"><form id="'+id+'-form" autocomplete="off"><label for="'+id+'-input">'+inputLabel+'</label>'+
 '<textarea id="'+id+'-input" rows="6" required spellcheck="false" placeholder="'+placeholder+'"></textarea><div id="'+id+'-counter" class="v3-counter"></div>'+
 '<label for="'+id+'-password">Пароль для сообщения</label><div class="v3-password-row"><input id="'+id+'-password" type="password" autocomplete="new-password" maxlength="256" required placeholder="Любой непустой пароль">'+
 '<button type="button" class="button secondary v3-show" data-target="'+id+'-password">Показать</button></div>'+
 '<p class="v3-warning">Пароль передавайте отдельно от кода. Короткий пароль легче подобрать. Не используйте пароль входа в приложение.</p>'+
 '<button id="'+id+'-submit" type="submit" class="button primary v3-submit">'+action+'</button></form>'+
 '<div id="'+id+'-result" class="v3-result" hidden><label for="'+id+'-output">'+resultLabel+'</label><textarea readonly id="'+id+'-output" rows="5"></textarea>'+
 '<div class="v3-buttons"><button type="button" class="button secondary" data-copy="'+id+'-output">Копировать</button><button type="button" class="button ghost" data-reset="'+id+'">Очистить</button></div></div>'+
 '<p id="'+id+'-error" class="v3-error" role="alert" hidden></p></div>';
 main.append(s);
 const form=$(id+'-form'),input=$(id+'-input'),password=$(id+'-password'),result=$(id+'-result'),output=$(id+'-output'),error=$(id+'-error'),button=$(id+'-submit');
 form.addEventListener('submit',async event=>{event.preventDefault();if(button.disabled)return;button.disabled=true;error.hidden=true;result.hidden=true;
 try{button.textContent='Обработка…';output.value=id==='quick-encrypt'?await encryptQuick(input.value,password.value):await decryptQuick(input.value,password.value);result.hidden=false;password.value='';
 if(id==='quick-encrypt'){input.value='';$(id+'-counter').textContent='0 / 4096 байт';}}
 catch(err){error.textContent=err.message||'Не удалось обработать сообщение.';error.hidden=false;}
 finally{button.disabled=false;button.textContent=action;}});
}
quickPage('quick-encrypt','Зашифровать','Зашифруйте текст отдельным паролем без добавления контакта.','Ваше сообщение','Введите текст…','Зашифрованный код','Зашифровать текст');
quickPage('quick-decrypt','Расшифровать','Вставьте код Q1: и пароль, который сообщил отправитель.','Зашифрованный код Q1:','Вставьте Q1:…','Расшифрованный текст','Расшифровать текст');
$('quick-decrypt-input').maxLength=5650;
$('quick-encrypt-counter').textContent='0 / 4096 байт';
$('quick-decrypt-counter').textContent='Доверенный контакт не требуется';
$('quick-encrypt-input').oninput=()=>{$('quick-encrypt-counter').textContent=new TextEncoder().encode($('quick-encrypt-input').value).length+' / 4096 байт';$('quick-encrypt-result').hidden=true;};
$('quick-decrypt-input').oninput=()=>{$('quick-decrypt-result').hidden=true;};
const settings=document.createElement('section');settings.id='page-settings';settings.className='page v3-page';settings.hidden=true;
settings.innerHTML='<div class="page-heading"><div class="eyebrow">ЛОКАЛЬНЫЙ ПРОФИЛЬ</div><h1>Настройки<span class="mint">.</span></h1><p class="subtitle">Управление паролем и безопасностью на этом устройстве.</p></div>'+
'<div class="panel padded v3-panel"><h2>Изменить пароль входа</h2><p class="field-hint">Смена пароля сохранит доверенные контакты и ключи. На других устройствах пароли не изменятся. Пароли сообщений остаются прежними.</p>'+
'<form id="change-password-form" autocomplete="off"><label for="change-password-current">Текущий пароль</label><input id="change-password-current" type="password" autocomplete="current-password" maxlength="256" required>'+
'<label for="change-password-new">Новый пароль</label><input id="change-password-new" type="password" autocomplete="new-password" maxlength="256" required placeholder="Любой непустой пароль">'+
'<label for="change-password-confirm">Повторите новый пароль</label><input id="change-password-confirm" type="password" autocomplete="new-password" maxlength="256" required>'+
'<p class="v3-warning">Короткий пароль менее безопасен. Сохраните новый пароль: восстановление без него невозможно.</p><button id="change-password-submit" class="button primary v3-submit" type="submit">Сменить пароль</button>'+
'<p id="change-password-status" class="v3-status" role="status" aria-live="polite" hidden></p></form></div>'+
'<div class="panel padded v3-panel v3-settings-extras"><h2>Дополнительно</h2><a class="button secondary" href="#security">Безопасность и хранение</a><a class="button secondary" href="#help">Инструкция</a></div>';
main.append(settings);
const buttons=[...document.querySelectorAll('.sidebar nav [data-page]')];
const byPage=page=>buttons.find(b=>b.dataset.page===page);
function rename(old,next,title){const b=byPage(old);if(!b)return;b.dataset.page=next;const node=[...b.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);if(node)node.textContent=title;b.setAttribute('aria-label',title);}
rename('encrypt','quick-encrypt','Зашифровать');rename('decrypt','quick-decrypt','Расшифровать');rename('security','settings','Настройки');
for(const name of ['pair','help']){const b=byPage(name);if(b)b.hidden=true;}
const dock=document.querySelector('.mobile-dock');
if(dock){const pairs=[['quick-encrypt','Шифровать'],['quick-decrypt','Читать'],['contacts','Контакты']];
 [...dock.querySelectorAll('[data-mobile-page]')].slice(0,3).forEach((b,i)=>{b.dataset.mobilePage=pairs[i][0];b.querySelector('span').textContent=pairs[i][1];});
 const more=$('mobile-more-button');if(more){more.dataset.mobilePage='settings';more.removeAttribute('aria-expanded');more.querySelector('span').textContent='Настройки';more.querySelector('use')?.setAttribute('href','#i-shield');more.onclick=()=>{byPage('settings')?.click();syncNav();};}
 $('mobile-more')?.remove();}
function syncNav(){const hash=location.hash.slice(1);if(dock)for(const b of dock.querySelectorAll('[data-mobile-page]')){const active=b.dataset.mobilePage===hash;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'page':'false');}}
for(const b of buttons)b.addEventListener('click',syncNav);
window.addEventListener('hashchange',syncNav);
const initial=location.hash.slice(1);
if(initial==='encrypt'||initial==='decrypt'){contactMode(initial);byPage('contacts')?.click();}
else if(!['contacts','pair','security','help','quick-encrypt','quick-decrypt','settings'].includes(initial)){byPage('quick-encrypt')?.click();}
else if(['quick-encrypt','quick-decrypt','settings'].includes(initial)){byPage(initial)?.click();}
syncNav();
for(const b of document.querySelectorAll('.v3-show'))b.onclick=()=>{const field=$(b.dataset.target);field.type=field.type==='password'?'text':'password';b.textContent=field.type==='password'?'Показать':'Скрыть';};
for(const b of document.querySelectorAll('[data-copy]'))b.onclick=async()=>{const field=$(b.dataset.copy);try{await navigator.clipboard.writeText(field.value);b.textContent='Скопировано ✓';setTimeout(()=>b.textContent='Копировать',2400);}catch{field.focus();field.select();b.textContent='Текст выделен — скопируйте';}};
for(const b of document.querySelectorAll('[data-reset]'))b.onclick=()=>{const id=b.dataset.reset;$(id+'-input').value='';$(id+'-output').value='';$(id+'-password').value='';$(id+'-result').hidden=true;$(id+'-error').hidden=true;};