// Подключи после шапки. Без этого файла ссылки меню останутся видимыми.
{
  const header = document.querySelector('.kit-header');
  const toggle = header?.querySelector('.kit-menu-toggle');
  const menu = header?.querySelector('.kit-menu');

  if (toggle && menu) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('kit-menu--open', open);
    };

    toggle.hidden = false;
    header.setAttribute('data-menu-ready', '');
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') === 'false'));
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    header.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
  }
}
