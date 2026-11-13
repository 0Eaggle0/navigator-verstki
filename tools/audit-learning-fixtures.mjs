// Эталоны исправляют только входные данные аудита; материалы и проверки сайта остаются прежними.
export const referenceOverrides = {
  'lesson-3/3-2-menu': { css: '.header{display:flex;justify-content:space-between;align-items:center}.menu{display:flex;gap:24px;list-style:none;margin:0;padding:0}' },
  'lesson-3/3-3-hero': { css: '.hero{display:flex;align-items:center;gap:32px}.hero__text,.hero__img{flex:1;min-width:0}' },
  'lesson-4/4-2-grid-cards': { css: '.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:16px}.card img{object-fit:cover}' },
  'lesson-4/4-3-sections-footer': { css: '.footer{padding:24px;background:#1e1e1e;color:white}.footer__cols{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}' },
  'lesson-5/5-2-mobile-375': { css: '@media(max-width:768px){.header{flex-direction:column}.menu{flex-wrap:wrap;gap:12px}.cards{grid-template-columns:1fr}}' },
};

const css = (id, name, extra) => ({ id, name, make: r => ({ ...r, css: r.css + '\n' + extra }) });
const js = (id, name, code) => ({ id, name, make: r => ({ ...r, js: code }) });
const html = (id, name, code) => ({ id, name, make: r => ({ ...r, html: code }) });
export const edgeCases = [
  css('tasks/site-base', 'Фиксированная ширина контейнера ломает телефон', '.container{width:600px;max-width:none}'),
  css('tasks/progress-bar', 'Полоска скрыта', 'progress{display:none}'),
  css('lesson-3/3-1-flexbox', 'Нет третьего кружка', '.dot:last-child{display:none}'),
  css('lesson-3/3-2-menu', 'Шапка скрыта', '.header{visibility:hidden}'),
  css('lesson-3/3-3-hero', 'Разные ширины при одинаковом flex-grow', '.hero__text{flex:1 1 300px}.hero__img{flex:1 1 50px}'),
  css('lesson-3/3-4-rows', 'Все преимущества кроме первого не оформлены', '.feature:not(:first-child){display:block;align-items:normal}'),
  css('lesson-4/4-1-grid', 'Плитки скрыты', '.grid>*{visibility:hidden}'),
  { id:'lesson-4/4-2-grid-cards',name:'minmax только в комментарии, сетка в одну колонку',make:(r,w)=>({...r,css:w.css+'\n.cards{display:grid;gap:16px;grid-template-columns:1fr}.card img{object-fit:cover}/* minmax(140px,1fr) */'}) },
  css('lesson-4/4-3-sections-footer', 'Белый текст на почти белом фоне, нет боковых отступов', '.footer{background:#fefefe;color:white;padding:24px 0 0}.footer__cols{grid-template-columns:3fr 1fr 1fr}'),
  { id:'lesson-5/5-1-media',name:'Мобильные стили применены ко всем экранам',make:(r,w)=>({...r,css:w.css+'\nh1{font-size:24px}.row{flex-direction:column}@media(max-width:1px){body{color:red}}'}),observe:async page=>{const f=page.locator('nav-sandbox iframe').first();return f.evaluate(el=>{el.style.width='1280px';return new Promise(resolve=>requestAnimationFrame(()=>resolve({width:el.contentWindow.innerWidth,h1:el.contentWindow.getComputedStyle(el.contentDocument.querySelector('h1')).fontSize,row:el.contentWindow.getComputedStyle(el.contentDocument.querySelector('.row')).flexDirection})))})} },
  { id:'lesson-5/5-2-mobile-375',name:'Одна колонка на всех экранах',make:(r,w)=>({...r,css:w.css+'\n.header{flex-direction:column}.menu{flex-wrap:wrap;gap:12px}.cards{grid-template-columns:1fr}@media(max-width:1px){body{color:red}}'}) },
  { id:'lesson-5/5-3-hover-check',name:'Наведение не меняет фон',make:(r,w)=>({...r,css:w.css+'\n.button{transition:0.2s}.button:hover{cursor:pointer}'}) },
  js('lesson-6/6-1-script', 'Захардкожена Оля, нет name и console.log', "function greet(){return 'Привет, Оля!'};document.querySelector('h1').textContent='Привет, кто-то!';"),
  js('lesson-6/6-2-dom', 'Переключение работает только два раза', "let n=0;document.querySelector('.theme-button').onclick=()=>{if(++n<=2)document.body.classList.toggle('dark')};"),
  css('lesson-6/6-3-burger', 'Меню не показывается даже после открытия', '.menu{display:none!important}'),
  js('lesson-6/6-4-modal', 'Немодальное окно вместо showModal', "const d=document.querySelector('.modal');document.querySelector('.open-modal').onclick=()=>d.open=true;document.querySelector('.close-modal').onclick=()=>d.open=false;"),
  { id:'lesson-7/7-1-filter-form',name:'Удалены все карточки',make:r=>({...r,html:r.html.replace(/<article[\s\S]*?<\/article>/g,'')}) },
  js('lesson-7/7-2-localstorage', 'Нет восстановления и работает только Барсик', "const b=document.querySelector('[data-id=barsik] .fav');b.onclick=()=>{const on=b.classList.toggle('active');localStorage.setItem('favorites',JSON.stringify(on?['barsik']:[]))};"),
  { id:'lesson-7/7-3-github-pages',name:'Удалены все изображения',make:r=>({...r,html:'<p><a href="about.html">О приюте</a></p>'}) },
  html('lesson-7/7-4-checklist', 'Удалены картинки и ссылки', '<header><h1>Заголовок</h1></header>'),
  { id:'tasks/adaptive-hide',name:'Контент скрыт также на компьютере',make:(r,w)=>({...r,css:w.css+'\n.desktop-only{display:none}.cards{grid-template-columns:1fr}@media(max-width:1px){body{color:red}}'}) },
  css('tasks/adaptive-image', 'Изображение скрыто', 'img{visibility:hidden}'),
  { id:'tasks/css-badge',name:'var только в комментарии, фон не связан с переменной',make:r=>({...r,css:r.css.replace('background: var(--accent);','background: #16A34A; /* var(--accent) */')}) },
  css('tasks/css-button', 'Три угла и половина отступов не оформлены', '.button{border-radius:8px 0 0 0;padding:12px 0 0 24px}'),
  css('tasks/flex-center', 'Кружок скрыт', '.dot{visibility:hidden}'),
  css('tasks/flex-footer-row', 'Соцсети идут столбиком', '.socials{flex-direction:column}'),
  css('tasks/grid-layout', 'Пустой контент обеих колонок', '.layout>*{visibility:hidden}'),
  css('tasks/grid-span', 'Растянута на три колонки вместо двух', '.card--big{grid-column:span 3}'),
  { id:'tasks/html-card',name:'Неправильный alt',make:r=>({...r,html:r.html.replace('Кошка Мурка','неизвестно')}) },
  html('tasks/html-menu', 'Три одинаковых пункта, пустые href', '<nav><ul><li><a href="">Контакты</a></li><li><a href="">Контакты</a></li><li><a href="">Контакты</a></li></ul></nav>'),
  js('tasks/js-counter', 'Всегда выводит 3 вместо счётчика', "document.querySelector('.plus').onclick=()=>document.querySelector('.count').textContent='3';"),
  js('tasks/js-form', 'Ошибка бессмысленная, успех без замены формы', "const f=document.querySelector('.form');f.onsubmit=e=>{e.preventDefault();if(!f.elements.name.value.trim())f.querySelector('.error').textContent='x';else f.insertAdjacentHTML('beforeend','<p>Спасибо!</p>')};"),
];

export const equivalents = [
  { id:'tasks/site-base',name:'Эквивалентная ширина через min()',expected:'accept',make:r=>({...r,css:r.css+'\n.container{width:min(600px,100%);max-width:none;margin:0 auto}'}) },
  { id:'tasks/progress-bar',name:'Другой id заголовка с правильной связью',expected:'accept',make:r=>({...r,html:r.html.replaceAll('goal-title','trip-title')}) },
  { id:'lesson-6/6-1-script',name:'Корректная стрелочная greet',expected:'accept',make:r=>({...r,js:"const name='Аня';const greet=n=>'Привет, '+n+'!';console.log(greet(name));document.querySelector('h1').textContent=greet(name);"}) },
  { id:'lesson-3/3-1-flexbox',name:'Эквивалентное оформление через inline styles',expected:'accept',make:r=>({...r,html:r.html.replace('class="row"','class="row" style="display:flex;justify-content:space-between;align-items:center"')}) },
  { id:'tasks/grid-span',name:'Эквивалентное grid-column 1 / 3',expected:'accept',make:r=>({...r,css:r.css+'\n.card--big{grid-column:1 / 3}'}) },
];
