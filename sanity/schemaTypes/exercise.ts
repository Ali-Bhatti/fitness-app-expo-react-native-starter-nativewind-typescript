import { defineType, defineField } from 'sanity'

export const exercise = defineType({
    name: 'exercise',
    title: 'Exercise',
    type: 'document',
    icon: () => '🏋️',
    fields: [
        defineField({
            name: 'externalId',
            title: 'External ID',
            type: 'string',
            description: 'The WorkoutX exercise ID (e.g. "0014").',
        }),
        defineField({
            name: 'name',
            title: 'Name',
            type: 'string',
            description: 'The display name of the exercise.',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'alternateNames',
            title: 'Alternate Names',
            type: 'array',
            of: [{ type: 'string' }],
            description: 'Other common names for this exercise.',
        }),
        defineField({
            name: 'description',
            title: 'Description',
            type: 'text',
            description: 'A brief explanation of what the exercise involves.',
        }),
        defineField({
            name: 'bodyPart',
            title: 'Body Part',
            type: 'string',
            description: 'The body part this exercise targets (e.g. Waist, Chest).',
        }),
        defineField({
            name: 'target',
            title: 'Target Muscle',
            type: 'string',
            description: 'The primary target muscle (e.g. Abs, Pectorals).',
        }),
        defineField({
            name: 'equipment',
            title: 'Equipment',
            type: 'string',
            description: 'Equipment required (e.g. Medicine Ball, Barbell).',
        }),
        defineField({
            name: 'instructions',
            title: 'Instructions',
            type: 'array',
            of: [{ type: 'string' }],
            description: 'Step-by-step instructions for performing this exercise.',
        }),
        defineField({
            name: 'category',
            title: 'Category',
            type: 'string',
            description: 'Exercise category (e.g. strength, cardio).',
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
            name: 'mechanic',
            title: 'Mechanic',
            type: 'string',
            description: 'Movement mechanic type (e.g. isolation, compound).',
        }),
        defineField({
            name: 'force',
            title: 'Force',
            type: 'string',
            description: 'Force type (e.g. push, pull).',
        }),
        defineField({
            name: 'met',
            title: 'MET Value',
            type: 'number',
            description: 'Metabolic equivalent of task.',
        }),
        defineField({
            name: 'caloriesPerMinute',
            title: 'Calories Per Minute',
            type: 'number',
            description: 'Estimated calories burned per minute.',
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
