import { betterAuth } from 'better-auth';
import { MongoClient } from 'mongodb';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { admin } from 'better-auth/plugins';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

function mongoConnectionUri(): string {
	const uri = process.env.MONGO_URI?.trim();
	if (uri) return uri;
	if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
		return 'mongodb://127.0.0.1:27017/__next_build_placeholder__';
	}
	throw new Error(
		'MONGO_URI is required. Set it in `.env` on the server (next to docker-compose) or in the container environment.',
	);
}

const client = new MongoClient(mongoConnectionUri());
const db = client.db();

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL,
	secret: process.env.BETTER_AUTH_SECRET!,
	database: mongodbAdapter(db, { client }),
	trustedOrigins: [
		// Production ERP frontend
		'http://139.59.92.69:3000',
		'https://139.59.92.69:3000',

		// Local dev
		'http://localhost:3000',
		'http://127.0.0.1:3000',
	],
	emailAndPassword: { enabled: true },
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
		},
	},
	user: {
		additionalFields: {
			phone: { type: 'string', required: false },
			address: { type: 'string', required: false },
			country: { type: 'string', required: false },
			city: { type: 'string', required: false },
			postalCode: { type: 'string', required: false },
			firstName: { type: 'string', required: false },
			lastName: { type: 'string', required: false },
		},
	},
	plugins: [admin({ defaultRole: 'cashier' })],
	session: {
		cookieCache: { enabled: true, maxAge: 5 * 60 },
	},
});
