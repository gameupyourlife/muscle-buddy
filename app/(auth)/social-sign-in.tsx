import { Button } from "react-native";
import { router } from "expo-router";
import { authClient } from "@/lib/auth-client";
import * as Linking from "expo-linking";

export default function SocialSignIn() {
    const handleLogin = async () => {
        const { error } = await authClient.signIn.social({
            provider: "google",
            callbackURL: Linking.createURL("/")
        })
        if (error) {
            // handle error
            return;
        }
        router.replace("/"); 
    };
    return <Button title="Login with Google" onPress={handleLogin} />;
}