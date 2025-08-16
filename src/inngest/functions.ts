import { gemini, createAgent } from "@inngest/agent-kit";
import { inngest } from "./client";
import { Sandbox } from "@e2b/code-interpreter";
import { getSandbox } from "./utils";

export const helloWorld = inngest.createFunction(
    { id: "hello-world" },
    { event: "test/hello.world" },
    async ({ event, step }) => {
        const sandboxId =  await step.run("get-sandbox-id", async () => {
            const sandbox = await Sandbox.create("prompt-deck-test-2");
            return sandbox.sandboxId;
        });
            const codeAgent = createAgent({
            name: "code-agent",
            system: "You are a expert next.js developer. You write readable, maintainable, and efficient code. You write simple Next.js and React snippets.",
            model: gemini({model:"gemini-2.5-pro"}),
        })

        const { output } = await codeAgent.run(
            'Write the following snippet: ' + event.data.value,
        );

        const sandboxUrl = await step.run("get-sandbox-url", async () => {
            const sandbox = await Sandbox.connect(sandboxId);
            const host = sandbox.getHost(3000);
            return "https://"+host;
        });
        return { output, sandboxUrl };
    },
);