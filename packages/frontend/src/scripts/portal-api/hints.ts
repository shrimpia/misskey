/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export type Hint = {
	content: string;
	url: string | null;
};

const apiEndpoint = 'https://portal-api.shrimpia.network/hints';

export const fetchHints = async (): Promise<Hint[]> => {
	const response = await fetch(apiEndpoint);
	const data = await response.json();

	return data as Hint[];
};
