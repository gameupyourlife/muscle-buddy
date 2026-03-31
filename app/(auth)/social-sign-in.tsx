import { Button } from "react-native";
import { router } from "expo-router";
import { authClient } from "@/lib/auth-client";

export default function SocialSignIn() {
    const handleLogin = async () => {
        const { error } = await authClient.signIn.social({
            provider: "google",
            callbackURL: "/dashboard"
        })
        if (error) {
            // handle error
            return;
        }
        router.replace("/dashboard"); 
    };
    return <Button title="Login with Google" onPress={handleLogin} />;
}