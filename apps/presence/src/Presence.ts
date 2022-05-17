import { Db } from 'mongodb';
import { IUser, UserStatus } from '@rocket.chat/core-typings';

import { UsersRaw } from '../../meteor/app/models/server/raw/Users';
import { UsersSessionsRaw } from '../../meteor/app/models/server/raw/UsersSessions';
import type { IPresence } from '../../meteor/server/sdk/types/IPresence';
import type { IBrokerNode } from '../../meteor/server/sdk/types/IBroker';
import { ServiceClass } from '../../meteor/server/sdk/types/ServiceClass';
import { processPresenceAndStatus } from './lib/processConnectionStatus';

export class Presence extends ServiceClass implements IPresence {
	private UsersSessions: UsersSessionsRaw;
	private Users: UsersRaw;

	constructor(db: Db) {
		super();

		this.name = 'presence';

		const Trash = db.collection('rocketchat__trash');

		const UsersCol = db.collection('users');

		const Users = new UsersRaw(UsersCol, Trash);
		const UsersSessions = new UsersSessionsRaw(db.collection('usersSessions'), Trash, {
			preventSetUpdatedAt: true,
		});

		this.Users = Users;
		this.UsersSessions = UsersSessions;
	}

	async onNodeDisconnected({ node }: { node: IBrokerNode }): Promise<void> {
		console.log('onNodeDisconnected', node);

		const affectedUsers = await this.removeLostConnections(node.id);
		return affectedUsers.forEach((uid) => this.updateUserPresence(uid));
	}

	async started(): Promise<void> {
		setTimeout(async () => {
			const affectedUsers = await this.removeLostConnections();
			return affectedUsers.forEach((uid) => this.updateUserPresence(uid));
		}, 100);
	}

	async newConnection(uid: string, session: string, nodeId: string): Promise<{ uid: string; connectionId: string } | undefined> {
		// if (metadata) {
		// 	update.$set = {
		// 		metadata: metadata
		// 	};
		// 	connection.metadata = metadata;
		// }

		await this.UsersSessions.addConnectionById(uid, {
			id: session,
			instanceId: nodeId,
			status: UserStatus.ONLINE,
		});

		await this.updateUserPresence(uid);
		return {
			uid,
			connectionId: session,
		};
	}

	async removeConnection(uid: string, session: string): Promise<{ uid: string; session: string }> {
		await this.UsersSessions.removeConnectionByConnectionId(session);

		await this.updateUserPresence(uid);

		return {
			uid,
			session,
		};
	}

	async removeLostConnections(nodeID?: string): Promise<string[]> {
		if (nodeID) {
			const affectedUsers = await this.UsersSessions.findByInstanceId(nodeID).toArray();

			const { modifiedCount } = await this.UsersSessions.removeConnectionsFromInstanceId(nodeID);

			if (modifiedCount === 0) {
				return [];
			}

			return affectedUsers.map(({ _id }) => {
				this.updateUserPresence(_id);
				return _id;
			});
		}

		// TODO  is this working?
		if (!this.context) {
			return [];
		}

		const nodes = await this.context.broker.nodeList();

		const ids = nodes.filter((node) => node.available).map(({ id }) => id);

		const affectedUsers = await this.UsersSessions.find({
			'connections.instanceId': {
				$exists: true,
				$nin: ids,
			},
		}, { projection: { _id: 1 } }).toArray();

		const update = {
			$pull: {
				connections: {
					instanceId: {
						$nin: ids,
					},
				},
			},
		};
		const { modifiedCount } = await this.UsersSessions.updateMany({}, update);

		if (modifiedCount === 0) {
			return [];
		}

		return affectedUsers.map(({ _id }) => {
			this.updateUserPresence(_id);
			return _id;
		});
	}

	async setStatus(uid: string, statusDefault: UserStatus, statusText?: string): Promise<boolean> {
		const userSessions = (await this.UsersSessions.findOneById(uid)) || { connections: [] };

		const { status, statusConnection } = processPresenceAndStatus(userSessions.connections, statusDefault);

		const result = await this.Users.updateStatusById(uid, {
			statusDefault,
			status,
			statusConnection,
			statusText,
		});

		if (result.modifiedCount > 0) {
			const user = await this.Users.findOneById<Pick<IUser, 'username'>>(uid, { projection: { username: 1 } });
			this.api.broadcast('presence.status', {
				user: { _id: uid, username: user?.username, status, statusText },
			});
		}

		return !!result.modifiedCount;
	}

	async setConnectionStatus(uid: string, status: UserStatus, session: string): Promise<boolean> {
		const result = await this.UsersSessions.updateConnectionStatusById(uid, session, status);

		await this.updateUserPresence(uid);

		return !!result.modifiedCount;
	}

	async updateUserPresence(uid: string): Promise<void> {
		const user = await this.Users.findOneById<Pick<IUser, 'username' | 'statusDefault' | 'statusText'>>(uid, {
			projection: {
				username: 1,
				statusDefault: 1,
				statusText: 1,
			},
		});
		if (!user) {
			return;
		}

		const userSessions = (await this.UsersSessions.findOneById(uid)) || { connections: [] };

		const { statusDefault } = user;

		const { status, statusConnection } = processPresenceAndStatus(userSessions.connections, statusDefault);

		const result = await this.Users.updateStatusById(uid, {
			status,
			statusConnection,
		});

		if (result.modifiedCount > 0) {
			this.api.broadcast('presence.status', {
				user: { _id: uid, username: user.username, status, statusText: user.statusText },
			});
		}
	}
}

