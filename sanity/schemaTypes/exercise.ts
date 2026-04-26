import { defineType, defineField } from 'sanity'

export const exercise = defineType({
    name: 'exercise',
    title: 'Exercise',
    type: 'document',
    icon: () => '🏋️',
    fields: [
        defineField({
            name: 'name',
            title: 'Name',
            type: 'string',
            description: 'The display name of the exercise.',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'description',
            title: 'Description',
            type: 'text',
            description: 'A brief explanation of what the exercise involves.',
        }),
        defineField({
            name: 'difficulty',
            title: 'Difficulty',
            type: 'string',
            description: 'The fitness level required to perform this exercise.',
            options: {
                list: [
                    { title: 'Beginner', value: 'beginner' },
                    { title: 'Intermediate', value: 'intermediate' },
                    { title: 'Advanced', value: 'advanced' },
                ],
                layout: 'radio',
            },
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'image',
            title: 'Image',
            type: 'image',
            description: 'A thumbnail or demo photo of the exercise.',
            options: { hotspot: true },
        }),
        defineField({
            name: 'videoUrl',
            title: 'Video URL',
            type: 'url',
            description: 'A link to a video demonstration (http or https).',
            validation: (rule) =>
                rule.uri({ scheme: ['http', 'https'] }).warning('Must be a valid http/https URL'),
        }),
        defineField({
            name: 'isActive',
            title: 'Is Active',
            type: 'boolean',
            description: 'Unpublish this exercise from the app without deleting it.',
            initialValue: true,
        }),
    ],
    preview: {
        select: {
            title: 'name',
            subtitle: 'difficulty',
            media: 'image',
        },
    },
})
