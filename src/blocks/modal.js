// МОДАЛЬНОЕ ОКНО. Вставь в script.js
const modal = document.querySelector('.modal');

// Открывают окно все кнопки с классом open-modal
document.querySelectorAll('.open-modal').forEach(function (button) {
  button.addEventListener('click', function () {
    modal.showModal();
  });
});

// Закрывает кнопка «Отмена». Ещё окно закрывается клавишей Esc — это браузер делает сам
document.querySelector('.close-modal').addEventListener('click', function () {
  modal.close();
});
