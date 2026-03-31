import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
    plugins: [
        expoClient({
            scheme: "muscle-buddy",
            storagePrefix: "muscle-buddy",
            storage: SecureStore,
        })
    ]
});