import Ajv from 'ajv';

const ajv = new Ajv({
	coerceTypes: true,
});

export type AutotranslateSaveSettingsParamsPOST = {
	roomId: string;
	field: string;
	value: boolean;
	defaultLanguage?: string;
};

const AutotranslateSaveSettingsParamsPostSchema = {
	type: 'object',
	properties: {
		roomId: {
			type: 'string',
		},
		field: {
			type: 'string',
		},
		value: {
			type: 'boolean',
		},
		defaultLanguage: {
			type: 'string',
			nullable: true,
		},
	},
	required: ['roomId', 'field', 'value', 'defaultLanguage'],
	additionalProperties: false,
};

export const isAutotranslateSaveSettingsParamsPOST = ajv.compile<AutotranslateSaveSettingsParamsPOST>(
	AutotranslateSaveSettingsParamsPostSchema,
);
