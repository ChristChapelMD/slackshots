import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

declare global {
  var betterAuthMongoClient: MongoClient | undefined;
}

const client =
  global.betterAuthMongoClient ??
  new MongoClient(process.env.MONGO_URI as string);

if (process.env.NODE_ENV !== "production") {
  global.betterAuthMongoClient = client;
}

const db = client.db(process.env.MONGO_DB_NAME);
const trustedOrigins = [
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_APP_URL,
].filter((origin): origin is string => Boolean(origin));

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: mongodbAdapter(db),
  socialProviders: {
    slack: {
      clientId: process.env.SLACK_CLIENT_ID as string,
      clientSecret: process.env.SLACK_CLIENT_SECRET as string,
    },
  },
  trustedOrigins: [...new Set(trustedOrigins)],
});
