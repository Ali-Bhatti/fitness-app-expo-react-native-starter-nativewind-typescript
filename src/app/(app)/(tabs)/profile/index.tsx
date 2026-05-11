import FTAlert from "@/components/FTAlert";
import { useAuth } from "@clerk/expo";
import React, { useState } from "react";
import { Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Page() {
  const { signOut } = useAuth();
  const [showSignOutAlert, setShowSignOutAlert] = useState(false);

  return (
    <SafeAreaView className="flex flex-1 p-4" edges={["top"]}>
      <Text className="text-2xl font-bold mb-4">Profile</Text>
      <Pressable
        className="bg-red-600 rounded-lg py-3 items-center active:bg-red-700"
        onPress={() => setShowSignOutAlert(true)}
      >
        <Text className="text-white font-semibold text-base">Sign Out</Text>
      </Pressable>

      <FTAlert
        visible={showSignOutAlert}
        type="warning"
        title="Sign Out"
        message="Are you sure you want to sign out?"
        onDismiss={() => setShowSignOutAlert(false)}
        buttons={[
          {
            text: "Sign Out",
            style: "destructive",
            onPress: () => signOut(),
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setShowSignOutAlert(false),
          },
        ]}
      />
    </SafeAreaView>
  );
}
