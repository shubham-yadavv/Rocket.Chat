import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useQuery } from 'react-query';

import { getPeriodRange, Period } from '../dataView/periods';

type UseMessagesSentOptions = { period: Period['key'] };

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useMessagesSent = ({ period }: UseMessagesSentOptions) => {
	const getMessagesSent = useEndpoint('GET', '/v1/engagement-dashboard/messages/messages-sent');

	return useQuery(
		['admin/engagement-dashboard/messages/messages-sent', { period }],
		async () => {
			const { start, end } = getPeriodRange(period);

			const response = await getMessagesSent({
				start,
				end,
			});

			return response
				? {
						...response,
						start,
						end,
				  }
				: undefined;
		},
		{
			refetchInterval: 5 * 60 * 1000,
		},
	);
};
