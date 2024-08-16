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
