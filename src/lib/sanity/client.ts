import { createClient } from '@sanity/client'
import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url'

const config = {
    projectId: process.env.EXPO_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.EXPO_PUBLIC_SANITY_DATASET!,
    apiVersion: '2026-04-29',
    useCdn: false,
}

// Clint safe config
export const sanityClient = createClient(config);

// Admin Level config (with token)
const adminConfig = {
    ...config,
    token: process.env.SANITY_API_TOKEN,
};

export const sanityAdminClient = createClient(adminConfig);

// Image URL builder
const builder = createImageUrlBuilder(sanityClient);
export const urlFor = (source: SanityImageSource) => builder.image(source);


