import { Stack } from "expo-router";
import React from "react";

function Layout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{
          title: "Edit Profile",
          headerBackTitle: 'Back',
          headerTintColor: '#0a7ea4',
          headerStyle: {
            backgroundColor: '#f8f8f8',
          },
          headerTitleStyle: {
            fontSize: 30, // text-3xl
            fontWeight: '700', // font-bold
            color: '#111827', // text-gray-900
          },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: "Notifications",
          headerBackTitle: 'Back',
          headerTintColor: '#0a7ea4',
          headerStyle: {
            backgroundColor: '#f8f8f8',
          },
          headerTitleStyle: {
            fontSize: 30, // text-3xl
            fontWeight: '700', // font-bold
            color: '#111827', // text-gray-900
          },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="preferences"
        options={{
          title: "Preferences",
          headerBackTitle: 'Back',
          headerTintColor: '#0a7ea4',
          headerStyle: {
            backgroundColor: '#f8f8f8',
          },
          headerTitleStyle: {
            fontSize: 30,
            fontWeight: '700',
            color: '#111827',
          },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="update-password"
        options={{
          title: "Update Password",
          headerBackTitle: 'Back',
          headerTintColor: '#0a7ea4',
          headerStyle: {
            backgroundColor: '#f8f8f8',
          },
          headerTitleStyle: {
            fontSize: 30,
            fontWeight: '700',
            color: '#111827',
          },
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}

export default Layout;
