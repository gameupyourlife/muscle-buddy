import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { db } from "./db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from './db/schema';
import { sendEmail } from "./send-email";

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
            await sendEmail({
                to: user.email,
                subject: "Reset your Muscle Buddy password",
                text: `Open this link to reset your password: ${url}`,
                html: `<p>Hi ${user.name ?? "there"},</p><p>Tap the link below to reset your password:</p><p><a href="${url}">Reset password</a></p>`,
            });
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
    ],
    user: {
        changeEmail: {
            enabled: true,
            sendChangeEmailConfirmation: async ({ user, newEmail, url, token }, request) => {
                await sendEmail({
                    to: user.email,
                    subject: "Confirm your Muscle Buddy email change",
                    text: `Approve your email change to ${newEmail}: ${url}`,
                    html: `<p>We received a request to change your email to <strong>${newEmail}</strong>.</p><p>Confirm it here: <a href="${url}">Approve email change</a></p>`,
                });
            }
        },
    }
});