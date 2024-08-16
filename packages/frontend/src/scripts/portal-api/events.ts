export type Event = {
	id: string;
	name: string;
	description: string;
	startDate: Date;
	endDate: Date;
	isAllDay: boolean;
	isOfficial: boolean;
	authorName: string;
};

const apiEndpoint = 'https://portal-api.shrimpia.network/events';

export const fetchEvents = async (): Promise<Event[]> => {
	const response = await fetch(apiEndpoint);
	const data = await response.json();

	return data.map((event: any) => ({
		id: event.id,
		name: event.name,
		description: event.description,
		startDate: new Date(event.startDate),
		endDate: new Date(event.endDate),
		isAllDay: event.isAllDay,
		isOfficial: event.isOfficial,
		authorName: event.authorName,
	}));
};
