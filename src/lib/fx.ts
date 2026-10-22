// Игровые эффекты: конфетти из элемента и тряска при ошибке. При «уменьшить движение» — ничего.
import confetti from 'canvas-confetti';

const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const COLORS = ['#3ccf6e', '#ffc930', '#ff5fa2', '#3db7ff', '#a77bff'];

// Конфетти вылетает из центра элемента. big — праздник побольше (уровень пройден)
export function burst(el: Element, big = false) {
	if (calm()) return;
	const r = el.getBoundingClientRect();
	confetti({
		origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight },
		particleCount: big ? 140 : 50,
		spread: big ? 100 : 70,
		startVelocity: big ? 45 : 30,
		scalar: 0.9,
		colors: COLORS,
		disableForReducedMotion: true,
		zIndex: 1000,
	});
}

export function shake(el: Element) {
	if (calm()) return;
	el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], {
		duration: 260,
		easing: 'ease-in-out',
	});
}
