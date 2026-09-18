/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/** 筆圧 0 のときに残る太さの割合 */
export const PRESSURE_MIN_RATIO = 0.25;

/**
 * 筆圧の平滑化の強さ (0〜1)。1 で生の値をそのまま使う。
 * 小さいほど滑らかになるが、筆圧の変化が遅れて付いてくる
 */
export const PRESSURE_SMOOTHING = 0.4;

/**
 * そのサンプルが「筆圧を取れている」と言えるか。
 *
 * ストローク中に一度でも true になったら、そのストロークは筆圧ありとして扱う。
 * マウスは押している間ずっと 0.5 固定なので対象外。指も端末差が大きいので見ない
 */
export function isPressureCapable(pointerType: string, pressure: number): boolean {
	return pointerType === 'pen' && Number.isFinite(pressure) && pressure > 0;
}

/**
 * PointerEvent の筆圧を、太さに掛けられる 0〜1 の値にする。
 *
 * `capable` はストローク単位の判定結果を渡すこと。サンプルごとに判定すると、
 * ペンを離した瞬間の `pressure: 0` を「筆圧非対応」と取り違えて、抜きが最大の太さになる
 */
export function resolvePressure(options: { pressure: number; enabled: boolean; capable: boolean; }): number {
	// 筆圧が使えない (設定オフ / マウス / 非対応) ときは設定どおりの太さ
	if (!options.enabled || !options.capable) return 1;
	if (!Number.isFinite(options.pressure)) return 1;
	return Math.min(1, Math.max(0, options.pressure));
}

/** 筆圧に応じた線の太さ。細くなりすぎて消えないよう最低 1px は残す */
export function widthForPressure(baseWidth: number, pressure: number): number {
	const ratio = PRESSURE_MIN_RATIO + (1 - PRESSURE_MIN_RATIO) * Math.min(1, Math.max(0, pressure));
	return Math.max(1, baseWidth * ratio);
}

/**
 * 筆圧を均す (指数移動平均)。
 *
 * デジタイザの量子化や手の震えで生の値は細かく揺れるため、そのまま太さに掛けると線が数珠状にガタつく
 */
export function smoothPressure(previous: number, next: number, factor = PRESSURE_SMOOTHING): number {
	const f = Math.min(1, Math.max(0, factor));
	return previous + (next - previous) * f;
}

/** 線分を刻む間隔。細い線ほど細かく置かないと途切れる */
export function stampStep(radius: number): number {
	return Math.max(0.5, radius / 2);
}

/** 線分をいくつのスタンプで埋めるか */
export function stampCount(distance: number, maxRadius: number): number {
	return Math.max(1, Math.ceil(distance / stampStep(maxRadius)));
}
