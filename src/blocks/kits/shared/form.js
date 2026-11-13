// Учебная проверка полей. Данные остаются в браузере.
{
  const form = document.querySelector('.kit-form');
  if (form) {
    form.hidden = false;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = form.elements.namedItem('name');
      const email = form.elements.namedItem('email');
      const status = form.querySelector('[role="status"]');
      const hasName = name.value.trim() !== '';
      const hasEmail = email.validity.valid;
      name.setAttribute('aria-invalid', String(!hasName));
      email.setAttribute('aria-invalid', String(!hasEmail));
      if (!hasName || !hasEmail) {
        status.textContent = hasName ? 'Проверь адрес электронной почты.' : 'Введи имя.';
        (hasName ? email : name).focus();
        return;
      }
      status.textContent = 'Форма проверена. Данные никуда не отправлены.';
    });
  }
}
