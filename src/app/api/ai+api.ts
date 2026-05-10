import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    const { exerciseName, alternateNames } = await request.json();

    if (!exerciseName) {
        return new Response(JSON.stringify({ error: "Missing exerciseName in request body" }), { status: 400 });
    }

    const prompt =
        `You are a fitness coach.
        You are given an exercise,provide clear instructions on how to perform the exercise.Include if any equipment is required.
        Explain the exercise in detail and for a beginner.
        
        The exercise name is:${exerciseName}
        Alternate names for the exercise are: ${alternateNames ? alternateNames.join(", ") : "None"}
        
        Keep it short and concise.Use markdown formatting.
        
        Use the following format:
        ## Equipment Required
        
        ## Instructions

        ### Tips

        ## Variations

        ### Safety

        keep spacing between the headings and the content.

        Always use headings and subheadings.
        `;

    console.log("Prompt sent to OpenAI:", prompt); // Debug log to check the prompt being sent
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1000,
        });

        console.log("Response from OpenAI:", response); // Debug log to check the raw response from OpenAI
        const aiGuidance = response.choices[0].message.content;
        return new Response(JSON.stringify({ aiGuidance }), { status: 200 });
    } catch (error) {
        console.error("Error generating AI guidance:", error);
        return new Response(JSON.stringify({ error: "Failed to generate AI guidance" }), { status: 500 });
    }
}