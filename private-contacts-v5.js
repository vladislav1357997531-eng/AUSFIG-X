const $=id=>document.getElementById(id);
const contacts=$('page-contacts'),box=document.createElement('section');box.className='p4-contact-box';
box.innerHTML='<h2>Шифрование с доверенными контактами</h2><p>Доступно только после входа в профиль и обмена ключами.</p><div class="p4-contact-tabs"><button type="button" class="selected" id="p4-contact-enc">Зашифровать контакту</button><button type="button" id="p4-contact-dec">Расшифровать от контакта</button></div><div id="p4-contact-content"></div>';
contacts.append(box);
for(const section of [$('page-encrypt'),$('page-decrypt')]){section.classList.remove('page');section.classList.add('p4-contact-operation');$('p4-contact-content').append(section);}
function contactMode(next){$('page-encrypt').hidden=next!=='encrypt';$('page-decrypt').hidden=next!=='decrypt';$('p4-contact-enc').classList.toggle('selected',next==='encrypt');$('p4-contact-dec').classList.toggle('selected',next==='decrypt');}
$('p4-contact-enc').onclick=()=>contactMode('encrypt');$('p4-contact-dec').onclick=()=>contactMode('decrypt');contactMode('encrypt');
document.addEventListener('ausfig-contact-pane',event=>contactMode(event.detail));
const navs=[...document.querySelectorAll('.sidebar nav [data-page]')];for(const page of ['encrypt','decrypt','help']){const n=navs.find(b=>b.dataset.page===page);if(n)n.hidden=true;}
const navSecurity=navs.find(b=>b.dataset.page==='security');if(navSecurity){navSecurity.setAttribute('aria-label','Настройки');const label=[...navSecurity.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);if(label)label.textContent='Настройки';}
const settingsPage=$('page-security');settingsPage.querySelector('.page-heading h1').textContent='Настройки';
const settings=document.createElement('section');settings.className='p4-settings panel padded';
settings.innerHTML='<h2>Изменить пароль профиля</h2><p>Пароль защищает только контакты и ключи на этом устройстве. Смена не затрагивает обычные сообщения.</p><form id="change-password-form" autocomplete="off"><label for="change-password-current">Текущий пароль</label><input id="change-password-current" type="password" autocomplete="current-password" required maxlength="256"><label for="change-password-new">Новый пароль</label><input id="change-password-new" type="password" autocomplete="new-password" required maxlength="256"><label for="change-password-confirm">Повторите новый пароль</label><input id="change-password-confirm" type="password" autocomplete="new-password" required maxlength="256"><p class="p4-tip">Короткие пароли хуже защищают ключи. Восстановления пароля нет.</p><button id="change-password-submit" type="submit" class="p4-primary">Сменить пароль</button><p id="change-password-status" role="status" hidden></p></form>';
settingsPage.prepend(settings);
const dock=document.createElement('nav');dock.className='p4-dock';dock.setAttribute('aria-label','Контакты и настройки');dock.innerHTML='<button type="button" data-v4-nav="contacts">Контакты</button><button type="button" data-v4-nav="pair">Обмен ключами</button><button type="button" data-v4-nav="security">Настройки</button>';$('shell').append(dock);
for(const b of dock.querySelectorAll('button'))b.onclick=()=>{navs.find(x=>x.dataset.page===b.dataset.v4Nav)?.click();updateNav();};
function updateNav(){const hash=location.hash.slice(1);for(const b of dock.querySelectorAll('button'))b.classList.toggle('selected',b.dataset.v4Nav===hash);}
window.addEventListener('hashchange',updateNav);navs.forEach(b=>b.addEventListener('click',updateNav));updateNav();
function normalizeTrusted(value){if(typeof value!=='string')return value;const start=value.search(/(?:M1|T1|AXP1)\s*:/i);if(start<0)return value;return value.slice(start).replace(/[\s\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF\u00AD`]/g,'');}
$('decrypt-form')?.addEventListener('submit',()=>{$('cipher-input').value=normalizeTrusted($('cipher-input').value);},true);
for(const [button,input] of [['answer-offer','offer-input'],['finish-offer','answer-input']])$(button)?.addEventListener('click',()=>{$(input).value=normalizeTrusted($(input).value);},true);
