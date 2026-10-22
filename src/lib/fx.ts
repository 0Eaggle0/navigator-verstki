// Игровые эффекты: монеты разлетаются, блок трясётся. При «уменьшить движение» — ничего.
import { svg } from './sprites';

const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Монеты вылетают из центра элемента и падают
export function burst(el: Element, n = 14) {
	if (calm()) return;
	const r = el.getBoundingClientRect();
	for (let i = 0; i < n; i++) {
		const c = document.createElement('span');
		c.className = 'px-coin-fx';
		c.innerHTML = svg('coin', 20);
		c.style.left = r.left + r.width / 2 + 'px';
		c.style.top = r.top + r.height / 2 + 'px';
		document.body.append(c);
		const dx = (Math.random() - 0.5) * 320;
		const up = 80 + Math.random() * 140;
		c.animate(
			[
				{ transform: 'translate(0, 0)' },
				{ transform: `translate(${dx * 0.6}px, ${-up}px)`, offset: 0.4 },
				{ transform: `translate(${dx}px, ${up}px)`, opacity: 0 },
			],
			{ duration: 900 + Math.random() * 300, easing: 'steps(12)' }
		).onfinish = () => c.remove();
	}
}

export function shake(el: Element) {
	if (calm()) return;
	el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], {
		duration: 240,
		easing: 'steps(4)',
	});
}
