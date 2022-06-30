import { Users, Sessions } from '@rocket.chat/models';

import { isSessionsPaginateProps, isSessionsProps } from '../../definition/rest/v1/sessions';
import { API } from '../../../app/api/server/api';
import { hasLicense } from '../../app/license/server/license';
import { Notifications } from '../../../app/notifications/server';

API.v1.addRoute(
	'sessions/list',
	{ authRequired: true, validateParams: isSessionsPaginateProps },
	{
		async get() {
			if (!this.userId) {
				API.v1.failure('error-invalid-user');
			}
			if (!hasLicense('device-management')) {
				return API.v1.unauthorized();
			}
			const { offset, count } = this.getPaginationItems();
			const { sort = { loginAt: -1 } } = this.parseJsonQuery();
			const search = this.queryParams?.filter || '';

			const sortKeys = ['loginAt', 'device.name', 'device.os.name'];
			if (!Object.keys(sort).filter((key) => sortKeys.includes(key)).length) {
				return API.v1.failure('error-invalid-sort');
			}

			const sessions = await Sessions.aggregateSessionsByUserId({ uid: this.userId, search, sort, offset, count });
			return API.v1.success(sessions);
		},
	},
);

API.v1.addRoute(
	'sessions/info',
	{ authRequired: true, validateParams: isSessionsProps },
	{
		async get() {
			if (!hasLicense('device-management')) {
				return API.v1.unauthorized();
			}

			const { sessionId } = this.queryParams;
			const sessions = await Sessions.findOneBySessionIdAndUserId(sessionId, this.userId);
			if (!sessions) {
				return API.v1.notFound('Session not found');
			}
			return API.v1.success(sessions);
		},
	},
);

API.v1.addRoute(
	'sessions/logout.me',
	{ authRequired: true, validateParams: isSessionsProps },
	{
		async post() {
			if (!this.userId) {
				API.v1.failure('error-invalid-user');
			}

			if (!hasLicense('device-management')) {
				return API.v1.unauthorized();
			}

			const { sessionId } = this.bodyParams;
			const sessionObj = await Sessions.findOneBySessionIdAndUserId(sessionId, this.userId);

			if (!sessionObj?.loginToken) {
				return API.v1.notFound('Session not found');
			}

			Promise.all([
				Users.unsetOneLoginToken(this.userId, sessionObj.loginToken),
				Sessions.logoutByloginTokenAndUserId({ loginToken: sessionObj.loginToken, userId: this.userId }),
			]);

			return API.v1.success({ sessionId });
		},
	},
);

API.v1.addRoute(
	'sessions/list.all',
	{ authRequired: true, twoFactorRequired: true, validateParams: isSessionsPaginateProps, permissionsRequired: ['view-device-management'] },
	{
		async get() {
			if (!hasLicense('device-management')) {
				return API.v1.unauthorized();
			}

			const { offset, count } = this.getPaginationItems();
			const { sort = { loginAt: -1 } } = this.parseJsonQuery();
			const search: string = this.queryParams?.filter || '';

			const sortKeys = ['loginAt', 'device.name', 'device.os.name', '_user.username', '_user.name'];
			if (!Object.keys(sort).filter((key) => sortKeys.includes(key)).length) {
				return API.v1.failure('error-invalid-sort');
			}

			const sessions = await Sessions.aggregateSessionsAndPopulate({ search, sort, offset, count });
			return API.v1.success(sessions);
		},
	},
);

API.v1.addRoute(
	'sessions/info.admin',
	{ authRequired: true, twoFactorRequired: true, validateParams: isSessionsProps, permissionsRequired: ['view-device-management'] },
	{
		async get() {
			if (!hasLicense('device-management')) {
				return API.v1.unauthorized();
			}

			const sessionId = this.queryParams?.sessionId as string;
			const { sessions } = await Sessions.aggregateSessionsAndPopulate({ search: sessionId, count: 1 });
			if (!sessions?.length) {
				return API.v1.notFound('Session not found');
			}
			return API.v1.success(sessions[0]);
		},
	},
);

API.v1.addRoute(
	'sessions/logout',
	{ authRequired: true, twoFactorRequired: true, validateParams: isSessionsProps, permissionsRequired: ['logout-device-management'] },
	{
		async post() {
			if (!hasLicense('device-management')) {
				return API.v1.unauthorized();
			}

			const { sessionId } = this.bodyParams;
			const sessionObj = await Sessions.findOneBySessionId(sessionId);

			if (!sessionObj?.loginToken) {
				return API.v1.notFound('Session not found');
			}

			Notifications.notifyUser(sessionObj.userId, 'force_logout');

			Promise.all([
				Users.unsetOneLoginToken(sessionObj.userId, sessionObj.loginToken),
				Sessions.logoutByloginTokenAndUserId({ loginToken: sessionObj.loginToken, userId: sessionObj.userId, logoutBy: this.userId }),
			]);

			return API.v1.success({ sessionId });
		},
	},
);
