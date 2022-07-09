/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { EventEmitter } from 'events';

import { jest, describe, test } from '@jest/globals';
import IMAP from 'imap';

import { IMAPInterceptor } from '../../../../server/email/IMAPInterceptor';

jest.mock('imap');
jest.mock('events', () => ({
	on: (event: string) => jest.fn,
}));

describe('IMAP Interceptor', () => {
	test('expect something', () => {
		new IMAPInterceptor({ user: 'any_user', password: 'any_password' });

		expect(IMAP).toHaveBeenCalledTimes(1);
	});

	test('verify imap state', () => {
		new IMAPInterceptor({ user: 'any_user', password: 'any_password' });
		jest.spyOn(new EventEmitter(), 'on');
		// expect(emitterMock.on).toBeCalledWith('error');
	});
});
