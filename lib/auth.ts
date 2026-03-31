import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { db } from "./db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from './db/schema';

export const auth = betterAuth({
    appName: "Muscle Buddy",
    plugins: [expo()],
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        resetPasswordTokenExpiresIn: 60 * 30,
        revokeSessionsOnPasswordReset: true,
        sendResetPassword: async ({ user, url }) => {
            // Replace this with a real mail provider in production.
            console.log(`[Better Auth] Reset password link for ${user.email}: ${url}`);
        },
    },
    database: drizzleAdapter(db, {
        provider: "pg", // or "pg" or "mysql",
        schema: schema
    }),
    trustedOrigins: ["muscle-buddy://*",
        // Development mode - Expo's exp:// scheme with local IP ranges
        ...(process.env.NODE_ENV === "development" ? [
            "exp://",                      // Trust all Expo URLs (prefix matching)
            "exp://**",                    // Trust all Expo URLs (wildcard matching)
            "exp://192.168.*.*:*/**",      // Trust 192.168.x.x IP range with any port and path
        ] : [])
    ]
});