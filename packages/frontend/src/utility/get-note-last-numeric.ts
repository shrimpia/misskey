const ENDS_WITH_NUMERIC = /-?\d+$/;

/**
 * 入力文字列が数字で終わるかを検証し、終わる場合はその数字を返します。
 * 数字がない場合は 1 を返します。
 * @param text - 入力文字列。
 */
export function getTextLastNumeric(text: string): number {
	const result = ENDS_WITH_NUMERIC.exec(text);
	// 数字がない場合は暗黙的に1とみなす
	if (!result) return 1;
	return parseInt(result[0]);
}

/**
 * 入力文字列の末尾の数字を取り除き、その文字列を返します。
 * @param text - 入力文字列。
 */
export function getTextWithoutEndingNumeric(text: string): string {
	return text.replace(ENDS_WITH_NUMERIC, '');
}
