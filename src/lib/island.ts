// Воксельный остров на главной (three.js). 7 платформ-миров по спирали, тропа между ними,
// флажок «ты тут», монеты над пройденными мирами. Кубики со скруглёнными гранями,
// мягкие тени — остров похож на игрушку из конструктора и плавно покачивается.
// Подписи миров — обычные ссылки поверх canvas (Island.astro), здесь только двигаем их.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type World = { n: number; done: boolean; here: boolean };

const R = 12; // радиус острова в кубиках

// Цвета кубиков
const C = {
	grass: 0x5cc85c,
	grass2: 0x4fb84f,
	sand: 0xe8d2a6,
	dirt: 0x8a5a2b,
	stone: 0x6e6a8f,
	stone2: 0x58547a,
	trunk: 0x6b4422,
	leaf: 0x3f9b3f,
	pine: 0x2f6b4f,
	water: 0x3b8fd9,
	water2: 0x6cb6f0,
	snow: 0xf4f2fc,
	rock: 0x9a95c2,
	wall: 0x8b88b3,
	gold: 0xffc930,
	red: 0xf07a4a,
	pink: 0xff8fb1,
	white: 0xffffff,
	space: 0x3b386c,
	soil: 0x7a5230,
	cloud: 0xffffff,
};

type Vox = [number, number, number, number]; // x, y, z, цвет

// Детерминированный «случай»: остров одинаковый при каждой загрузке
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// Где стоят миры: спираль от центра к краю
const spot = (i: number) => {
	const r = 2.6 + i * 1.15;
	const a = i * 1.15 + 0.4;
	return [Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r)] as const;
};

// Постройка мира на платформе 3×3 (координаты от центра платформы, y от верха острова)
function decor(n: number): Vox[] {
	const v: Vox[] = [];
	const pad = (c: number, c2 = c) => {
		for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) v.push([x, 1, z, (x + z) % 2 ? c2 : c]);
	};
	switch (n) {
		case 1: // луг: дерево и цветы
			pad(C.grass, C.grass2);
			v.push([0, 2, 0, C.trunk], [0, 3, 0, C.trunk]);
			for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) v.push([x, 4, z, C.leaf]);
			v.push([0, 5, 0, C.leaf], [1, 2, 1, C.pink], [-1, 2, 1, C.gold]);
			break;
		case 2: // лес: ёлка
			pad(C.pine, C.leaf);
			v.push([0, 2, 0, C.trunk]);
			for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) v.push([x, 3, z, C.pine]);
			v.push([0, 4, 0, C.pine], [1, 4, 0, C.pine], [-1, 4, 0, C.pine], [0, 4, 1, C.pine], [0, 4, -1, C.pine]);
			v.push([0, 5, 0, C.pine], [0, 6, 0, C.gold]);
			break;
		case 3: // река: вода с кувшинкой
			pad(C.water, C.water2);
			v.push([1, 2, -1, C.leaf], [-1, 2, 1, C.leaf], [0, 2, 0, C.pink]);
			break;
		case 4: // сад: грядки
			pad(C.soil);
			for (let x = -1; x <= 1; x += 2) for (let z = -1; z <= 1; z++) v.push([x, 2, z, z === 0 ? C.red : C.leaf]);
			break;
		case 5: // горы: вершина со снегом
			pad(C.rock, C.stone);
			for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) v.push([x, 2, z, C.stone]);
			v.push([0, 3, 0, C.rock], [1, 3, 0, C.rock], [0, 3, 1, C.rock], [0, 4, 0, C.snow], [0, 5, 0, C.snow]);
			break;
		case 6: // замок: башня
			pad(C.stone2, C.stone);
			for (let y = 2; y <= 4; y++) for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) if (x || z) v.push([x, y, z, C.wall]);
			v.push([0, 3, 1, C.gold]);
			for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) v.push([x, 5, z, C.wall]);
			v.push([0, 5, 0, C.red], [0, 6, 0, C.red]);
			break;
		default: // космос: ракета
			pad(C.space);
			v.push([0, 2, 0, C.white], [0, 3, 0, C.white], [0, 4, 0, C.white], [0, 5, 0, C.red]);
			v.push([1, 2, 0, C.red], [-1, 2, 0, C.red], [0, 3, 1, C.water2]);
	}
	return v;
}

// Один InstancedMesh на группу кубиков: быстро даже на слабой видеокарте
function voxels(list: Vox[], size = 1) {
	// Скругление граней — 1 сегмент: игрушечный вид без лишней нагрузки на видеокарту
	const geo = new RoundedBoxGeometry(size, size, size, 1, size * 0.12);
	const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), list.length);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	const m = new THREE.Matrix4();
	const c = new THREE.Color();
	list.forEach(([x, y, z, col], i) => {
		mesh.setMatrixAt(i, m.makeTranslation(x, y, z));
		mesh.setColorAt(i, c.setHex(col));
	});
	return mesh;
}

export function init(box: HTMLElement, worlds: World[], labels: HTMLElement[], calm: boolean) {
	const canvas = box.querySelector('canvas')!;
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	const scene = new THREE.Scene();

	// Свет: днём ярче, ночью синеватый
	const sky = new THREE.HemisphereLight(0xffffff, 0x3b386c, 1.6);
	const sun = new THREE.DirectionalLight(0xffffff, 1.6);
	sun.position.set(14, 26, 8);
	sun.castShadow = true;
	sun.shadow.mapSize.set(1024, 1024);
	Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 70 });
	sun.shadow.bias = -0.002;
	scene.add(sky, sun);
	const theme = () => {
		const night = document.documentElement.dataset.theme !== 'light';
		sky.color.setHex(night ? 0xb3adff : 0xffffff);
		sky.groundColor.setHex(night ? 0x2a2366 : 0x8f87cf);
		sky.intensity = night ? 2.1 : 1.9;
		sun.color.setHex(night ? 0xd6d0ff : 0xfff3d6);
		sun.intensity = night ? 1.9 : 2.4;
	};
	theme();
	new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

	// Остров: верх из травы, тропа из песка, снизу земля и камень — «летающий» остров
	const path = new Set<string>();
	const centers = worlds.map((_, i) => spot(i));
	for (let i = 0; i < centers.length - 1; i++) {
		const [x0, z0] = centers[i];
		const [x1, z1] = centers[i + 1];
		const steps = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
		for (let s = 0; s <= steps; s++) {
			const x = Math.round(x0 + ((x1 - x0) * s) / steps);
			const z = Math.round(z0 + ((z1 - z0) * s) / steps);
			path.add(`${x},${z}`).add(`${x + 1},${z}`);
		}
	}
	const busy = (x: number, z: number) => centers.some(([cx, cz]) => Math.abs(cx - x) <= 2 && Math.abs(cz - z) <= 2);
	const land: Vox[] = [];
	for (let x = -R; x <= R; x++)
		for (let z = -R; z <= R; z++) {
			const d = Math.hypot(x, z) + rnd() * 0.8;
			if (d > R) continue;
			const top = path.has(`${x},${z}`) ? C.sand : d > R - 1.2 ? C.sand : rnd() < 0.5 ? C.grass : C.grass2;
			land.push([x, 0, z, top]);
			const depth = Math.round((R - d) * 0.7) + 1;
			for (let y = 1; y <= depth; y++) land.push([x, -y, z, y < 3 ? C.dirt : rnd() < 0.5 ? C.stone : C.stone2]);
			// Редкие деревья там, где нет миров и тропы
			if (top !== C.sand && !busy(x, z) && d < R - 2 && rnd() < 0.03) {
				land.push([x, 1, z, C.trunk], [x, 2, z, C.leaf], [x + 1, 2, z, C.leaf], [x - 1, 2, z, C.leaf], [x, 2, z + 1, C.leaf], [x, 2, z - 1, C.leaf], [x, 3, z, C.leaf]);
			}
		}
	const island = new THREE.Group();
	island.add(voxels(land));
	scene.add(island);

	// Миры: своя группа на каждый, чтобы приподнимать при наведении
	const groups = worlds.map((w, i) => {
		const g = new THREE.Group();
		g.add(voxels(decor(w.n)));
		const [x, z] = centers[i];
		g.position.set(x, 0, z);
		// Пройденный мир — монета над ним
		if (w.done) {
			const coin = voxels([[0, 0, 0, C.gold]], 0.8);
			coin.position.y = 7.5;
			coin.name = 'coin';
			g.add(coin);
		}
		// «Ты тут» — флажок
		if (w.here) {
			const flag = voxels([[0, 0, 0, C.white], [0, 1, 0, C.white], [0, 2, 0, C.white], [0, 3, 0, C.white], [0.75, 3, 0, C.red], [1.5, 3, 0, C.red], [0.75, 2.25, 0, C.red]], 0.5);
			flag.position.set(1.2, 2, 1.2);
			flag.name = 'flag';
			g.add(flag);
		}
		island.add(g);
		return g;
	});

	// Облака из кубиков ходят по кругу
	const clouds = new THREE.Group();
	for (let k = 0; k < 4; k++) {
		const a = (k / 4) * Math.PI * 2;
		const cl: Vox[] = [];
		for (let x = 0; x < 4; x++) for (let z = 0; z < 2; z++) cl.push([x, 0, z, C.cloud]);
		cl.push([1, 1, 0, C.cloud], [2, 1, 1, C.cloud]);
		const m = voxels(cl);
		(m.material as THREE.MeshLambertMaterial).transparent = true;
		(m.material as THREE.MeshLambertMaterial).opacity = 0.85;
		m.position.set(Math.cos(a) * (R + 4), 6 + k, Math.sin(a) * (R + 4));
		clouds.add(m);
	}
	scene.add(clouds);

	// Камера — изометрия сверху сбоку
	const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
	let angle = 0.8;
	let zoom = 1;
	const resize = () => {
		const w = box.clientWidth;
		const h = box.clientHeight;
		renderer.setSize(w, h, false);
		const view = (w < 600 ? 15 : 11.5) / zoom;
		camera.left = (-view * w) / h;
		camera.right = (view * w) / h;
		camera.top = view;
		camera.bottom = -view;
		camera.updateProjectionMatrix();
	};
	new ResizeObserver(resize).observe(box);
	resize();

	// Наведение: какой мир под курсором или в фокусе
	let hover = -1;
	const ray = new THREE.Raycaster();
	const mouse = new THREE.Vector2();
	labels.forEach((l, i) => {
		l.addEventListener('pointerenter', () => (hover = i));
		l.addEventListener('focus', () => (hover = i));
		l.addEventListener('pointerleave', () => (hover = -1));
		l.addEventListener('blur', () => (hover = -1));
	});

	// Перетаскивание мышью или пальцем крутит остров
	let drag: number | null = null;
	let dragged = 0; // насколько протащили — чтобы перетаскивание не считалось кликом
	let lastMove = 0;
	canvas.addEventListener('pointerdown', (e) => {
		drag = e.clientX;
		dragged = 0;
		canvas.setPointerCapture(e.pointerId);
	});
	canvas.addEventListener('pointerup', () => (drag = null));
	canvas.addEventListener('pointermove', (e) => {
		const r = canvas.getBoundingClientRect();
		mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
		if (drag !== null) {
			angle -= (e.clientX - drag) * 0.01;
			dragged += Math.abs(e.clientX - drag);
			drag = e.clientX;
			lastMove = performance.now();
		}
		ray.setFromCamera(mouse, camera);
		const hit = ray.intersectObjects(groups, true)[0];
		hover = hit ? groups.findIndex((g) => g === hit.object.parent || g === hit.object.parent?.parent) : -1;
		canvas.style.cursor = hover >= 0 ? 'pointer' : drag !== null ? 'grabbing' : 'grab';
	});
	canvas.addEventListener('click', () => hover >= 0 && dragged < 6 && labels[hover].click());

	// Пока курсор над островом или фокус на подписи — остров не крутится, по мирам легко попасть
	let inside = false;
	box.addEventListener('pointerenter', () => (inside = true));
	box.addEventListener('pointerleave', () => (inside = false));
	box.addEventListener('focusin', () => (inside = true));
	box.addEventListener('focusout', () => (inside = false));

	// Кадр: поворот, подъём мира под курсором, подписи следуют за мирами
	const v = new THREE.Vector3();
	let visible = true;
	new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(box);
	const frame = (t: number) => {
		if (!calm && !inside && drag === null && t - lastMove > 1500) angle += 0.0025;
		// Остров плавно покачивается в воздухе
		if (!calm) island.position.y = Math.sin(t / 1400) * 0.45;
		camera.position.set(Math.cos(angle) * 40, 32, Math.sin(angle) * 40);
		camera.lookAt(0, 1, 0);
		groups.forEach((g, i) => {
			const target = i === hover ? 1.2 : 0;
			g.position.y += (target - g.position.y) * 0.2;
			const coin = g.getObjectByName('coin');
			if (coin && !calm) coin.rotation.y = t / 400;
			const flag = g.getObjectByName('flag');
			if (flag && !calm) flag.position.y = 2 + Math.sin(t / 300) * 0.4;
			// Подпись над миром (в координатах сцены — с учётом покачивания острова)
			g.getWorldPosition(v);
			v.y += 7;
			v.project(camera);
			const l = labels[i];
			l.style.left = ((v.x + 1) / 2) * 100 + '%';
			l.style.top = ((1 - v.y) / 2) * 100 + '%';
			l.classList.toggle('is-hover', i === hover);
			l.style.zIndex = String(Math.round((1 - v.z) * 100));
		});
		if (!calm) clouds.rotation.y = t / 30000;
		renderer.render(scene, camera);
	};
	if (calm) {
		// «Уменьшить движение»: один кадр и перерисовка только при наведении или повороте
		const redraw = () => requestAnimationFrame(frame);
		canvas.addEventListener('pointermove', redraw);
		labels.forEach((l) => (l.addEventListener('focus', redraw), l.addEventListener('blur', redraw)));
		new ResizeObserver(redraw).observe(box);
		redraw();
	} else {
		renderer.setAnimationLoop((t) => visible && !document.hidden && frame(t));
	}
	box.classList.add('is-3d');
}
