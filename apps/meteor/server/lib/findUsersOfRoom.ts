import type { IUser } from '@rocket.chat/core-typings';
import type { FindCursor } from 'mongodb';
import type { FindPaginated } from '@rocket.chat/model-typings';
import { Users } from '@rocket.chat/models';

import { settings } from '../../app/settings/server';

type FindUsersParam = {
	rid: string;
	status?: string;
	skip?: number;
	limit?: number;
	filter?: string;
	sort?: Record<string, any>;
};

export function findUsersOfRoom({
	rid,
	status,
	skip = 0,
	limit = 0,
	filter = '',
	sort = {},
}: FindUsersParam): FindPaginated<FindCursor<IUser>> {
	const options = {
		projection: {
			name: 1,
			username: 1,
			nickname: 1,
			status: 1,
			avatarETag: 1,
			_updatedAt: 1,
		},
		sort: {
			statusConnection: -1,
			...(sort || { [settings.get('UI_Use_Real_Name') ? 'name' : 'username']: 1 }),
		},
		...(skip > 0 && { skip }),
		...(limit > 0 && { limit }),
	};

	return Users.findPaginatedByActiveUsersExcept(filter, undefined, options, undefined, [
		{
			__rooms: rid,
			...(status && { status }),
		},
	]);
}
