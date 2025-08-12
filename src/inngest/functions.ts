import { gemini, createAgent } from "@inngest/agent-kit";
import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
    { id: "hello-world" },
    { event: "test/hello.world" },
    async ({ event, step }) => {
        
        const codeAgent = createAgent({
            name: "code-agent",
            system: "You are a expert next.js developer. You write readable, maintainable, and efficient code. You write simple Next.js and React snippets.",
            model: gemini({model:"gemini-2.5-pro"}),
        })

        const { output } = await codeAgent.run(
            'Write the following snippet: ' + event.data.value,
        );

        return { output };
    },
);