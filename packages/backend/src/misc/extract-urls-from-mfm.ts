/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as mfm from 'mfm-js';

/**
 * MFMトークンからURLを抽出
 * @param nodes MFMノードの配列
 * @returns URL文字列の配列
 */
export function extractUrlsFromMfm(nodes: mfm.MfmNode[]): string[] {
	const urls: string[] = [];

	function extractFromNode(node: mfm.MfmNode): void {
		if (node.type === 'url') {
			urls.push(node.props.url);
		} else if (node.type === 'link') {
			urls.push(node.props.url);
		} else if ('children' in node && node.children) {
			for (const child of node.children) {
				extractFromNode(child);
			}
		}
	}

	for (const node of nodes) {
		extractFromNode(node);
	}

	return urls;
}

/**
 * ノートにURLが含まれるかチェック
 * @param tokens MFMトークン
 * @returns URLが含まれる場合true
 */
export function hasUrl(tokens: mfm.MfmNode[]): boolean {
	return extractUrlsFromMfm(tokens).length > 0;
}
