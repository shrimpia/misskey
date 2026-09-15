/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// @ts-check
/**
 * Misskey SPDX ヘッダーの検査 / 自動修正。
 *
 * 使い方:
 *   node scripts/check-spdx.mjs                    ローカル検査 (repo 全体 + HTML コメント形式)
 *   node scripts/check-spdx.mjs --check            同上 (明示形)
 *   node scripts/check-spdx.mjs --ci               CI 互換検査 (現行の OR 判定を維持)
 *   node scripts/check-spdx.mjs --fix [--base REF] このブランチの欠落だけ自動修正して全体を再検査
 *
 * #region shrimpia
 * 挿入する著作権表記は、本家 ref (SPDX_UPSTREAM_REF / upstream/develop / upstream/master)
 * にそのファイルが存在するかで自動的に切り替わる。存在すれば本家名義、存在しなければ
 * フォーク名義 (Ebise Lutica and GitHub Contributors)。本家 ref を解決できない環境では
 * フォーク名義を既定とする。--fix と併せて --fork / --upstream で明示指定もできる。
 * 検査側は両方の名義を正として受理する。詳細は ルート CLAUDE.md 参照。
 * #endregion
 *
 * 終了コード:
 *   0 = 選択したモードの検査に合格
 *   1 = SPDX 欠落またはローカル検査でのコメント形式違反
 *   2 = 引数、Git ref、ファイル列挙・読取などの理由で検査不能
 *
 * CI 互換判定は、現行 CI と同じく copyright 行または AGPL license 行のどちらか
 * 一方が全文のどこかにあれば pass する。この判定はライセンス表記の完全性や正当性を
 * 保証しない。ローカル検査は、加えて .vue / .html のコメント形式を検査する。
 *
 * --check / --ci の合否はブランチの所有権で絞らない。--fix だけが統合先との差分を
 * 使い、自分の変更に含まれる欠落へ修正対象を限定する。修正後は必ず全体を再検査する。
 */

import { lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname } from 'node:path';

import { DEFAULT_INTEGRATION_REFS, findClosestMergeBase, gitLines, gitMergeBase, gitPaths } from './lib/git.mjs';

/** CI の対象ディレクトリ。この配列を CI とローカル検査の両方が使う。 */
const TARGET_DIRECTORIES = [
	'packages/backend/migration',
	'packages/backend/src',
	'packages/backend/test',
	'packages/frontend-shared/@types',
	'packages/frontend-shared/js',
	'packages/frontend-builder',
	'packages/frontend/.storybook',
	'packages/frontend/@types',
	'packages/frontend/lib',
	'packages/frontend/public',
	'packages/frontend/src',
	'packages/frontend/test',
	'packages/frontend-embed/@types',
	'packages/frontend-embed/src',
	'packages/icons-subsetter/src',
	'packages/misskey-bubble-game/src',
	'packages/misskey-reversi/src',
	'packages/sw/src',
	'scripts',
];

const TARGET_EXTENSIONS = new Set(['.cjs', '.html', '.js', '.mjs', '.scss', '.ts', '.vue']);
const EXCLUDED_CONFIG_EXTENSIONS = new Set(['.cjs', '.js', '.mjs', '.ts']);
const HTML_COMMENT_EXTENSIONS = new Set(['.vue', '.html']);

const COPYRIGHT_LINE = 'SPDX-FileCopyrightText: syuilo and misskey-project';
const LICENSE_LINE = 'SPDX-License-Identifier: AGPL-3.0-only';

const HTML_HEADER = `<!--\n${COPYRIGHT_LINE}\n${LICENSE_LINE}\n-->\n\n`;
const BLOCK_HEADER = `/*\n * ${COPYRIGHT_LINE}\n * ${LICENSE_LINE}\n */\n\n`;

// #region shrimpia フォーク新規ファイルの著作権表記
/**
 * シュリンピアフォークが新規作成したファイル (本家に存在しないファイル) の著作権表記。
 * 本家由来ファイルの改変では COPYRIGHT_LINE を維持する。詳細は ルート CLAUDE.md 参照。
 */
const FORK_COPYRIGHT_LINE = 'SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors';

const FORK_HTML_HEADER = `<!--\n${FORK_COPYRIGHT_LINE}\n${LICENSE_LINE}\n-->\n\n`;
const FORK_BLOCK_HEADER = `/*\n * ${FORK_COPYRIGHT_LINE}\n * ${LICENSE_LINE}\n */\n\n`;

/** 本家由来かどうかの判定に使う ref 候補。環境変数 SPDX_UPSTREAM_REF が最優先。 */
const UPSTREAM_REFS = ['upstream/develop', 'upstream/master'];
// #endregion

/** @typedef {'check' | 'fix' | 'ci'} Mode */
/** @typedef {'auto' | 'fork' | 'upstream'} Origin */
/** @typedef {'missing' | 'wrong-form' | 'ok'} Verdict */

class OperationalError extends Error {}

/**
 * パスが存在する通常ファイルかを判定する。
 *
 * @param {string} file
 * @returns {boolean}
 */
function isRegularFile(file) {
	try {
		return lstatSync(file).isFile();
	} catch (error) {
		if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return false;
		throw new OperationalError(`${file}: ファイル種別を確認できない`);
	}
}

/**
 * パスが SPDX 検査の対象条件を満たすかを判定する。
 *
 * @param {string} file
 * @returns {boolean}
 */
function isTargetPath(file) {
	const ext = extname(file);
	if (!TARGET_EXTENSIONS.has(ext)) return false;

	const name = basename(file);
	if (name.includes('eslint')) return false;
	if (EXCLUDED_CONFIG_EXTENSIONS.has(ext) && name.endsWith(`.config${ext}`)) return false;

	return isRegularFile(file);
}

/**
 * Git の index と必要に応じて untracked から SPDX 対象ファイルを列挙する。
 *
 * @param {boolean} includeUntracked
 * @returns {string[]}
 */
function listTargetFiles(includeUntracked) {
	const args = ['ls-files', '--cached'];
	if (includeUntracked) args.push('--others', '--exclude-standard');
	args.push('-z', '--', ...TARGET_DIRECTORIES);

	return [...new Set(gitPaths(args))].filter(isTargetPath);
}

/**
 * 明示 ref または利用可能な統合先から merge-base を選ぶ。
 *
 * @param {string | null} explicitRef
 * @returns {string}
 */
function resolveMergeBase(explicitRef) {
	if (explicitRef !== null) return gitMergeBase(explicitRef);

	try {
		return findClosestMergeBase(DEFAULT_INTEGRATION_REFS);
	} catch (error) {
		const detail = error instanceof Error ? ` — ${error.message}` : '';
		throw new OperationalError(`統合先の merge-base を解決できない。--base <ref> を指定すること${detail}`);
	}
}

/**
 * merge-base 以降の commit 済み・未commit・untracked の変更を集める。
 *
 * @param {string | null} explicitRef
 * @returns {Set<string>}
 */
function listLocalChanges(explicitRef) {
	const base = resolveMergeBase(explicitRef);
	return new Set([
		...gitPaths(['diff', '--name-only', '--diff-filter=d', '-z', `${base}...HEAD`]),
		...gitPaths(['diff', '--name-only', '--diff-filter=d', '-z', 'HEAD']),
		...gitPaths(['ls-files', '--others', '--exclude-standard', '-z']),
	]);
}

/**
 * 指定位置が閉じた HTML コメントの内側かを判定する。
 *
 * @param {string} text
 * @param {number} index
 * @returns {boolean}
 */
function isInsideHtmlComment(text, index) {
	const before = text.slice(0, index);
	const lastOpen = before.lastIndexOf('<!--');
	if (lastOpen === -1) return false;
	const close = text.indexOf('-->', lastOpen + '<!--'.length);
	return close !== -1 && index < close;
}

/**
 * ファイルの SPDX 行と HTML コメント形式を判定する。
 *
 * @param {string} file
 * @returns {Verdict}
 */
function judge(file) {
	let text;
	try {
		text = readFileSync(file, 'utf8');
	} catch {
		throw new OperationalError(`${file}: 内容を読み取れない`);
	}

	// #region shrimpia フォーク名義の copyright 行も正として受理する
	const positions = [text.indexOf(COPYRIGHT_LINE), text.indexOf(FORK_COPYRIGHT_LINE), text.indexOf(LICENSE_LINE)]
		.filter((index) => index >= 0);
	// #endregion
	if (positions.length === 0) return 'missing';
	if (!HTML_COMMENT_EXTENSIONS.has(extname(file))) return 'ok';

	return positions.every((position) => isInsideHtmlComment(text, position)) ? 'ok' : 'wrong-form';
}

// #region shrimpia 本家由来かフォーク新規かの判定
/** @type {string | null | undefined} 解決済みの本家 ref。null は解決不能。 */
let upstreamRef;

/**
 * 本家の所在を表す ref を 1 度だけ解決する。
 *
 * @returns {string | null}
 */
function resolveUpstreamRef() {
	if (upstreamRef !== undefined) return upstreamRef;

	const configured = process.env.SPDX_UPSTREAM_REF;
	const candidates = configured === undefined || configured === '' ? UPSTREAM_REFS : [configured, ...UPSTREAM_REFS];
	for (const ref of candidates) {
		try {
			gitLines(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { quiet: true });
			upstreamRef = ref;
			return ref;
		} catch {
			// 次の候補へ
		}
	}

	upstreamRef = null;
	return null;
}

/**
 * ヘッダー挿入時に使う著作権表記を選ぶ。
 *
 * 本家 ref にファイルが存在しなければフォークの新規ファイルとみなす。本家 ref を
 * 解決できない環境 (upstream remote 未設定 / shallow clone) ではフォーク名義を既定に
 * する。ヘッダーが欠落したファイルはこのリポジトリで新規に書かれたものなので、本家
 * 名義を誤って入れるより誤りが小さい。
 *
 * @param {string} file
 * @param {Origin} origin
 * @returns {boolean} フォーク名義を使うなら true
 */
function useForkHeader(file, origin) {
	if (origin !== 'auto') return origin === 'fork';

	const ref = resolveUpstreamRef();
	if (ref === null) return true;

	try {
		gitLines(['cat-file', '-e', `${ref}:${file}`], { quiet: true });
		return false;
	} catch {
		return true;
	}
}
// #endregion

/**
 * ファイル種別と先頭指示行に合わせ、SPDX ヘッダーを適切な位置へ挿入する。
 *
 * @param {string} file
 * @param {Origin} origin
 * @returns {boolean} フォーク名義で挿入したなら true
 */
function insertHeader(file, origin) {
	const original = readFileSync(file, 'utf8');
	const bom = original.charCodeAt(0) === 0xfeff ? '﻿' : '';
	const body = bom === '' ? original : original.slice(1);
	const eol = body.includes('\r\n') ? '\r\n' : '\n';

	/** ファイルの改行コードに合わせてヘッダーを変換する。 @param {string} header */
	const withEol = (header) => (eol === '\n' ? header : header.replaceAll('\n', eol));

	// #region shrimpia 本家由来かフォーク新規かでヘッダーを切り替える
	const fork = useForkHeader(file, origin);
	const htmlHeader = fork ? FORK_HTML_HEADER : HTML_HEADER;
	const blockHeader = fork ? FORK_BLOCK_HEADER : BLOCK_HEADER;
	// #endregion

	if (HTML_COMMENT_EXTENSIONS.has(extname(file))) {
		writeFileSync(file, bom + withEol(htmlHeader) + body);
		return fork;
	}

	const newlineIndex = body.indexOf('\n');
	const firstLine = (newlineIndex === -1 ? body : body.slice(0, newlineIndex)).replace(/\r$/, '');

	if (firstLine.startsWith('#!') || firstLine.startsWith('@charset')) {
		const rest = newlineIndex === -1 ? '' : body.slice(newlineIndex + 1);
		writeFileSync(file, bom + firstLine + eol + eol + withEol(blockHeader) + rest);
		return fork;
	}

	writeFileSync(file, bom + withEol(blockHeader) + body);
	return fork;
}

/**
 * CLI 引数を検証し、実行モードと基準 ref を取り出す。
 *
 * @param {string[]} args
 * @returns {{ mode: Mode, baseRef: string | null, origin: Origin } | null}
 */
function parseArgs(args) {
	/** @type {Mode} */ let mode = 'check';
	let explicitMode = false;
	/** @type {string | null} */ let baseRef = null;
	/** @type {Origin} */ let origin = 'auto';

	for (let index = 0; index < args.length; index++) {
		const arg = args[index];
		if (arg === '--check' || arg === '--fix' || arg === '--ci') {
			if (explicitMode) return null;
			mode = arg === '--check' ? 'check' : arg === '--fix' ? 'fix' : 'ci';
			explicitMode = true;
			continue;
		}
		if (arg === '--base') {
			if (baseRef !== null || args[index + 1] === undefined || args[index + 1].startsWith('--')) return null;
			baseRef = args[++index];
			continue;
		}
		// #region shrimpia 名義の明示指定
		if (arg === '--fork' || arg === '--upstream') {
			if (origin !== 'auto') return null;
			origin = arg === '--fork' ? 'fork' : 'upstream';
			continue;
		}
		// #endregion
		return null;
	}

	if (baseRef !== null && mode !== 'fix') return null;
	if (origin !== 'auto' && mode !== 'fix') return null;
	return { mode, baseRef, origin };
}

/**
 * 対象ファイルを検査し、違反種別ごとの一覧にまとめる。
 *
 * @param {string[]} targets
 * @returns {{ missing: string[], wrongForm: string[] }}
 */
function inspectTargets(targets) {
	/** @type {string[]} */ const missing = [];
	/** @type {string[]} */ const wrongForm = [];

	for (const file of targets) {
		const verdict = judge(file);
		if (verdict === 'missing') missing.push(file);
		if (verdict === 'wrong-form') wrongForm.push(file);
	}

	return { missing, wrongForm };
}

/**
 * SPDX の検査・修正を実行し、集約した終了コードを返す。
 *
 * @returns {number}
 */
function main() {
	const options = parseArgs(process.argv.slice(2));
	if (options === null) {
		console.error('usage: node scripts/check-spdx.mjs [--check | --ci | --fix [--base <ref>] [--fork | --upstream]]');
		return 2;
	}

	try {
		const root = gitLines(['rev-parse', '--show-toplevel'])[0];
		if (root === undefined) throw new OperationalError('git リポジトリの外で実行された');
		process.chdir(root);

		const includeUntracked = options.mode !== 'ci';
		let targets = listTargetFiles(includeUntracked);
		/** @type {string[]} */ const fixed = [];

		if (options.mode === 'fix') {
			const localChanges = listLocalChanges(options.baseRef);
			const initial = inspectTargets(targets);
			for (const file of initial.missing) {
				if (!localChanges.has(file)) continue;
				// #region shrimpia 挿入した名義を出力に残す
				const fork = insertHeader(file, options.origin);
				fixed.push(fork ? `${file} (フォーク名義)` : file);
				// #endregion
			}
			targets = listTargetFiles(true);
		}

		const result = inspectTargets(targets);
		for (const file of fixed) console.log(`fixed:      ${file}`);
		for (const file of result.missing) console.log(`missing:    ${file}`);
		if (options.mode !== 'ci') {
			for (const file of result.wrongForm) console.log(`wrong-form: ${file}`);
		}
		if (fixed.length > 0 || result.missing.length > 0 || (options.mode !== 'ci' && result.wrongForm.length > 0)) {
			console.log('');
		}

		const failed = result.missing.length > 0 || (options.mode !== 'ci' && result.wrongForm.length > 0);
		if (!failed) {
			if (options.mode === 'ci') {
				console.log(`SPDX CI: OK — 現行 OR 判定を対象 ${targets.length} ファイルが通過した。`);
			} else {
				const prefix = fixed.length > 0 ? `${fixed.length} ファイルを修正し、` : '';
				console.log(`SPDX: OK — ${prefix}CI 判定と HTML コメント形式を対象 ${targets.length} ファイルが通過した。追加確認は不要。`);
			}
			return 0;
		}

		if (result.missing.length > 0) {
			console.log(`SPDX: CI 判定上の欠落 ${result.missing.length} 件。`);
			if (options.mode === 'check') {
				console.log("SPDX: 統合先との差分に含まれる欠落は '--fix' で自動修正できる。");
			} else if (options.mode === 'fix') {
				console.log('SPDX: --fix の対象外を含む欠落が残っているため、CI は通らない。');
			}
		}
		if (options.mode !== 'ci' && result.wrongForm.length > 0) {
			console.log(`SPDX: HTML コメント形式違反 ${result.wrongForm.length} 件。`);
		}
		return 1;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`SPDX: 検査不能 — ${message}`);
		return 2;
	}
}

// process.exit() だと stdout が pipe のとき未フラッシュの出力が切り捨てられる。
process.exitCode = main();
