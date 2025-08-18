import { openai, gemini, createAgent, createTool, AnyZodType, createNetwork } from "@inngest/agent-kit";
import { inngest } from "./client";
import { Sandbox } from "@e2b/code-interpreter";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { z } from "zod";
import { PROMPT } from "@/prompt";

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
            description: "A code agent that can write and modify code in a sandboxed Next.js environment.",
            system: PROMPT,
            model: gemini({
                model:"gemini-2.5-pro",
                defaultParameters: { generationConfig: { temperature: 0.1 } },
            }),
            // model: openai({ model: "gpt-4o" }),
            tools: [
                createTool({
                    name: "terminal",
                    description: "Use the terminal to run commands in the sandbox.",
                    parameters: z.object({
                        command: z.string(),
                    }) as unknown as AnyZodType,
                    handler: async ({ command }, { step }) => {
                        return await step?.run("terminal",async () => {
                            const buffers = {stdout:"", stderr:""};
                            try {
                                const sandbox = await getSandbox(sandboxId);
                                const result = await sandbox.commands.run(command, {
                                    onStdout(data: string) {
                                        buffers.stdout += data;
                                    },
                                    onStderr(data: string) {
                                        buffers.stderr += data;
                                    },
                                });
                                return result.stdout;
                            } catch (error) {
                                console.error(
                                    `Command failed: ${error} \nstdoud: ${buffers.stdout} \nstderr: ${buffers.stderr}`,
                                );
                                return `Command failed: ${error} \nstdoud: ${buffers.stdout} \nstderr: ${buffers.stderr}`;
                            }
                        });
                    }
                }),
                createTool({
                    name: "createOrUpdateFile",
                    description: "Create or update a file in the sandbox.",
                    parameters: z.object({
                        files: z.array(
                            z.object({
                                path: z.string(),
                                content: z.string(),
                            }),
                        )
                    }),
                    handler: async ({ files }, { step, network }) => {
                        const newFiles = await step?.run("createOrUpdateFiles", async () => {
                            try {
                                const updatedFiles = network.state.data.files || {};
                                const sandbox = await getSandbox(sandboxId);
                                for (const file of files) {
                                    await sandbox.files.write(file.path, file.content);
                                    updatedFiles[file.path] = file.content;
                                }
                                return updatedFiles;
                            } catch (error) {
                                return "Error :"+error;
                            }
                        });
                        if(typeof newFiles === "object") {
                            network.state.data.files = newFiles;
                        }
                    }
                }),
                createTool({
                    name: "readFiles",
                    description: "Read a file from the sandbox.",
                    parameters: z.object({
                        files: z.array(z.string()),
                    }),
                    handler: async ({ files }, { step }) => {
                        return await step?.run("readFiles", async () => {
                            try {
                                const sandbox = await getSandbox(sandboxId);
                                const contents = [];
                                for (const file of files) {
                                    const content = await sandbox.files.read(file);
                                    contents.push({ path: file, content });
                                }
                                return JSON.stringify(contents);
                            } catch (error) {
                                return "Error reading files: " + error;
                            }
                        })
                    },
                }),
            ],
            lifecycle:{
                onResponse: async ( { result, network }) => {
                    const lastAssistantMessageText = 
                     lastAssistantTextMessageContent(result);

                    if(lastAssistantMessageText && network){
                        if(lastAssistantMessageText.includes("<task_summary>")){
                            network.state.data.summary = lastAssistantMessageText;
                        }
                    }
                    return result;
                },
            }
        });

        const network = createNetwork({
            name: "coding-agent-network",
            agents: [codeAgent],
            maxIter: 15,
            router: async ({network}) => {
                const summary = network.state.data.summary;
                if(summary){
                    return;
                }
                return codeAgent;
            }
        })

        const result = await network.run(event.data.value);

        const sandboxUrl = await step.run("get-sandbox-url", async () => {
            const sandbox = await Sandbox.connect(sandboxId);
            const host = sandbox.getHost(3000);
            return "https://"+host;
        });
        return { 
            url: sandboxUrl,
            title: "Fragment",
            files: result.state.data.files,
            summary: result.state.data.summary,
         };
    },
);