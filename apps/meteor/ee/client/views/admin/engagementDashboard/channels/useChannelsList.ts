import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useQuery } from 'react-query';

import { getPeriodRange, Period } from '../dataView/periods';

type UseChannelsListOptions = {
	period: Period['key'];
	offset: number;
	count: number;
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useChannelsList = ({ period, offset, count }: UseChannelsListOptions) => {
	const getChannelsList = useEndpoint('GET', '/v1/engagement-dashboard/channels/list');

	return useQuery(
		['admin/engagement-dashboard/channels/list', { period, offset, count }],
		async () => {
			const { start, end } = getPeriodRange(period);

			const response = await getChannelsList({
				start,
				end,
				offset,
				count,
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
			keepPreviousData: true,
			refetchInterval: 5 * 60 * 1000,
		},
	);
};
