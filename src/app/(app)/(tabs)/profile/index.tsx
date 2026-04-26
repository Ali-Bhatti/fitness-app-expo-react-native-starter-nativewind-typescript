import { useAuth } from "@clerk/expo";
import React from "react";
import { Alert, Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Page() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => signOut(),
        },
      ],
      { cancelable: true }
    )
  }

  return (
    <SafeAreaView className="flex flex-1 p-4" edges={["top"]}>
      <Text className="text-2xl font-bold mb-4">Profile</Text>
      <Pressable
        className="bg-red-600 rounded-lg py-3 items-center active:bg-red-700"
        onPress={handleSignOut}
      >
        <Text className="text-white font-semibold text-base">Sign Out</Text>
      </Pressable>
    </SafeAreaView>
  );
}
