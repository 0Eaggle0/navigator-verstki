// Значения фильтров должны совпадать с data-kit-category у карточек.
{
  const filters = document.querySelector('.kit-filters-list');
  const cards = document.querySelectorAll('.kit-card[data-kit-category]');
  if (filters && cards.length) {
    filters.hidden = false;
    const status = document.querySelector('.kit-filter-status');
    filters.addEventListener('click', (event) => {
      const button = event.target.closest('[data-kit-filter]');
      if (!button) return;
      const category = button.dataset.kitFilter;
      let visible = 0;
      for (const card of cards) {
        card.hidden = category !== 'all' && card.dataset.kitCategory !== category;
        if (!card.hidden) visible++;
      }
      for (const option of filters.querySelectorAll('button')) {
        option.setAttribute('aria-pressed', String(option === button));
      }
      status.textContent = 'Событий показано: ' + visible;
    });
  }
}
