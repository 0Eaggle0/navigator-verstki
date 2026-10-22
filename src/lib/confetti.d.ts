// У canvas-confetti нет своих типов — описываем то, что используем в src/lib/fx.ts
declare module 'canvas-confetti' {
	const confetti: (options?: Record<string, unknown>) => Promise<null> | null;
	export default confetti;
}
