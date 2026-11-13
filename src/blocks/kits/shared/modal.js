// Подключи вместе с блоком modal.html. Закрытие по Escape делает сам браузер.
{
  const dialog = document.querySelector('#kit-about');
  if (dialog) {
    for (const button of document.querySelectorAll('[data-kit-open]')) {
      button.hidden = false;
      button.addEventListener('click', () => {
        if (!dialog.open) dialog.showModal();
      });
    }
  }
}
