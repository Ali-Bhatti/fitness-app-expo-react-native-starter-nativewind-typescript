/// <reference types="nativewind/types" />

declare module "*.css";

declare var process: {
	env: {
		EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
		[key: string]: string | undefined;
	};
};
