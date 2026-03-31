import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { db } from "./db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
    plugins: [expo()],
    emailAndPassword: {
        enabled: true, // Enable authentication using email and password.
    },
    database: drizzleAdapter(db, {
        provider: "pg", // or "pg" or "mysql"
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