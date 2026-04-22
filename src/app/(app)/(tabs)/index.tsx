import { Link } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Page() {
  return (
    <SafeAreaView className="flex flex-1" edges={["top"]}>
      <Header />
      <Content />
    </SafeAreaView>
  );
}

function Content() {
  return (
    <View className="flex-1">
      <View className="py-12 md:py-24 lg:py-32 xl:py-48">
        <View className="px-4 md:px-6">
          <View className="flex flex-col items-center gap-4 text-center">
            <Text
              role="heading"
              className="text-3xl text-center native:text-5xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl"
            >
              Expo + Tailwind (NativeWind) Template77
            </Text>

            <Text className="mx-auto max-w-[700px] text-lg text-center md:text-xl">
              This template sets up Expo and Tailwind (NativeWind) allowing you
              to quickly get started with my YouTube tutorial!
            </Text>
            <Link href="https://www.youtube.com/@sonnysangha" target="_blank">
              <Text className="text-lg text-center text-blue-500 hover:text-blue-700 underline md:text-xl dark:text-blue-400 dark:hover:text-blue-300">
                https://www.youtube.com/@sonnysangha
              </Text>
            </Link>

            <View className="gap-4">
              <Link asChild href="https://www.youtube.com/@sonnysangha">
                <Pressable className="h-11 items-center justify-center rounded-md bg-gray-900 px-4 active:bg-gray-700">
                  <Text className="text-sm font-medium text-gray-50">
                    Visit my YouTube Channel
                  </Text>
                </Pressable>
              </Link>
            </View>

            <View className="gap-4">
              <Link asChild href="https://www.papareact.com/course">
                <Pressable className="flex h-9 items-center justify-center overflow-hidden rounded-md bg-red-700 px-4 active:bg-red-800">
                  <Text className="text-sm font-medium text-gray-50">
                    Get the Complete Source Code (Plus 60+ builds) ❤️
                  </Text>
                </Pressable>
              </Link>
            </View>

            <View className="gap-4">
              <Link asChild href="https://www.papareact.com/course">
                <Pressable className="flex h-9 items-center justify-center overflow-hidden rounded-md bg-green-700 px-4 active:bg-green-800 py-2">
                  <Text className="text-sm font-medium text-gray-50">
                    Join My Course & Learn to Code with AI 💚 (1000+ Students)
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function Header() {
  return (
    <View>
      <View className="px-4 lg:px-6 h-14 flex items-center flex-row justify-between ">
        <Link className="font-bold flex-1 items-center justify-center" href="/">
          PAPAFAM
        </Link>
        <View className="">
          <Link
            className="text-md font-medium hover:underline web:underline-offset-4"
            href="https://www.papareact.com/course"
          >
            Join My Course ❤️
          </Link>
        </View>
      </View>
    </View>
  );
}
