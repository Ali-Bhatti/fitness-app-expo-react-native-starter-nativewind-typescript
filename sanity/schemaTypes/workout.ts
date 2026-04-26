import { defineType, defineField, defineArrayMember } from 'sanity'

export const workout = defineType({
    name: 'workout',
    title: 'Workout',
    type: 'document',
    icon: () => '💪',
    fields: [
        defineField({
            name: 'userId',
            title: 'User ID',
            type: 'string',
            description: 'The Clerk ID of the user who logged this workout.',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'date',
            title: 'Date',
            type: 'datetime',
            description: 'When the workout took place.',
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: 'duration',
            title: 'Duration (seconds)',
            type: 'number',
            description: 'Total workout duration in seconds.',
            validation: (rule) => rule.required().min(0).integer(),
        }),
        defineField({
            name: 'exercises',
            title: 'Exercises',
            type: 'array',
            description: 'The exercises performed during this workout.',
            of: [
                defineArrayMember({
                    type: 'object',
                    fields: [
                        defineField({
                            name: 'exercise',
                            title: 'Exercise',
                            type: 'reference',
                            to: [{ type: 'exercise' }],
                            description: 'The exercise performed.',
                            validation: (rule) => rule.required(),
                        }),
                        defineField({
                            name: 'sets',
                            title: 'Sets',
                            type: 'array',
                            description: 'Each set performed for this exercise.',
                            of: [
                                defineArrayMember({
                                    type: 'object',
                                    fields: [
                                        defineField({
                                            name: 'reps',
                                            title: 'Reps',
                                            type: 'number',
                                            description: 'Number of repetitions performed.',
                                            validation: (rule) => rule.required().min(0).integer(),
                                        }),
                                        defineField({
                                            name: 'weight',
                                            title: 'Weight',
                                            type: 'number',
                                            description: 'Amount of weight used.',
                                            validation: (rule) => rule.min(0),
                                        }),
                                        defineField({
                                            name: 'weightUnit',
                                            title: 'Weight Unit',
                                            type: 'string',
                                            description: 'Unit of measurement for the weight.',
                                            options: {
                                                list: [
                                                    { title: 'Kilograms (kg)', value: 'kg' },
                                                    { title: 'Pounds (lbs)', value: 'lbs' },
                                                ],
                                                layout: 'radio',
                                            },
                                            initialValue: 'kg',
                                        }),
                                    ],
                                    preview: {
                                        select: {
                                            reps: 'reps',
                                            weight: 'weight',
                                            unit: 'weightUnit',
                                        },
                                        prepare({ reps, weight, unit }) {
                                            const parts = []
                                            if (reps != null) parts.push(`${reps} reps`)
                                            if (weight != null) parts.push(`${weight} ${unit ?? 'kg'}`)
                                            return { title: parts.join(' · ') || 'Set' }
                                        },
                                    },
                                }),
                            ],
                        }),
                    ],
                    preview: {
                        select: {
                            title: 'exercise.name',
                            sets: 'sets',
                        },
                        prepare({ title, sets }) {
                            const count = Array.isArray(sets) ? sets.length : 0
                            return {
                                title: title ?? 'Exercise',
                                subtitle: `${count} set${count !== 1 ? 's' : ''}`,
                            }
                        },
                    },
                }),
            ],
        }),
    ],
    preview: {
        select: {
            userId: 'userId',
            date: 'date',
            duration: 'duration',
        },
        prepare({ userId, date, duration }) {
            const formattedDate = date
                ? new Date(date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                  })
                : 'No date'
            const mins = duration != null ? `${Math.round(duration / 60)} min` : ''
            return {
                title: formattedDate,
                subtitle: [userId, mins].filter(Boolean).join(' · '),
            }
        },
    },
})
