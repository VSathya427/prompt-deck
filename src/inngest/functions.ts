
import { openai, gemini, createAgent, createTool, AnyZodType, createNetwork, type Tool, Message, createState } from "@inngest/agent-kit";
import { inngest } from "./client";
import { Sandbox } from "@e2b/code-interpreter";
import { getSandbox, lastAssistantTextMessageContent, parseAgentOutput } from "./utils";
import { z } from "zod";
import { PRESENTATION_FRAGMENT_TITLE_PROMPT, PRESENTATION_RESPONSE_PROMPT, PROMPT } from "@/prompt";
import { prisma } from "@/lib/db";

interface AgentState {
    summary: string;
    files: { [path: string]: string };
};

export const codeAgentFunction = inngest.createFunction(
    { id: "code-agent" },
    { event: "code-agent/run" },
    async ({ event, step }) => {
        const sandboxId = await step.run("get-sandbox-id", async () => {
            // Use a presentation-focused sandbox environment
            const sandbox = await Sandbox.create("prompt-deck-pynext");
            return sandbox.sandboxId;
        });

        const CreatePresentationSchema = z.object({
            deckHtml: z.string().min(1),  // full <!doctype html>... for public/deck.html
        });

        const previousMessages = await step.run("get-previous-messages", async () => {
            const formattedMessages: Message[] = [];
            const messages = await prisma.message.findMany({
                where: {
                    projectId: event.data.projectId,
                },
                orderBy: {
                    createdAt: "desc", // TODO: Change to "asc" if ai doesnt understand whats the latest message
                },
            });

            for (const message of messages) {
                formattedMessages.push({
                    type: "text",
                    role: message.role === "ASSISTANT" ? "assistant" : "user",
                    content: message.content,
                })
            }

            return formattedMessages;
        });

        const state = createState<AgentState>(
            {
                summary: "",
                files: {},
            },
            {
                messages: previousMessages,
            },
        );

        const codeAgent = createAgent<AgentState>({
            name: "code-agent",
            description: "A code agent that can create interactive presentations using HTML, CSS, JavaScript and presentation frameworks like impress.js in a sandboxed environment.",
            system: `${PROMPT}.`,
            model: gemini({
                // model: "gemini-2.5-flash",
                model: "gemini-2.5-pro",
                defaultParameters: { generationConfig: { temperature: 0.1 } },
            }),
            // model: openai({ model: "gpt-4o" }),
            tools: [
                createTool({
                    name: "terminal",
                    description: "Use the terminal to run commands, install packages, and test demos.",
                    parameters: z.object({
                        command: z.string(),
                    }) as unknown as AnyZodType,
                    handler: async ({ command }, { step }) => {
                        return await step?.run("terminal", async () => {
                            const buffers = { stdout: "", stderr: "" };
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
                                return `Command failed: ${error} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`;
                            }
                        });
                    }
                }),

                createTool({
                    name: "createOrUpdateFile",
                    description: "Create or update HTML, CSS, JavaScript, Python, and other project files.",
                    parameters: z.object({
                        files: z.array(
                            z.object({
                                path: z.string(),
                                content: z.string(),
                            }),
                        )
                    }),
                    handler: async ({ files }, { step, network }: Tool.Options<AgentState>) => {
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
                                return "Error: " + error;
                            }
                        });
                        if (typeof newFiles === "object") {
                            network.state.data.files = newFiles;
                        }
                    }
                }),

                createTool({
                    name: "readFiles",
                    description: "Read files from the sandbox to review or modify existing content.",
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
                        });
                    },
                }),

                // Updated setupExportCapabilities (optional - remove if not needed)
                createTool({
                    name: "setupExportCapabilities",
                    description: "Install packages for PDF export and Python demos.",
                    parameters: z.object({
                        exportFormats: z.array(z.enum(['pdf', 'python', 'both'])),
                    }),
                    handler: async ({ exportFormats }, { step }) => {
                        return await step?.run("setupExport", async () => {
                            try {
                                const sandbox = await getSandbox(sandboxId);
                                const commands = [];

                                if (exportFormats.includes('pdf') || exportFormats.includes('both')) {
                                    commands.push('npm install html2canvas jspdf --yes');
                                }

                                if (exportFormats.includes('python') || exportFormats.includes('both')) {
                                    commands.push('pip install numpy matplotlib pandas seaborn plotly requests --break-system-packages');
                                }

                                let results = [];
                                for (const command of commands) {
                                    const result = await sandbox.commands.run(command);
                                    results.push(result.stdout);
                                }

                                return `Packages installed:\n${results.join('\n')}`;
                            } catch (error) {
                                return `Error installing packages: ${error}`;
                            }
                        });
                    }
                }),
            ],
            lifecycle: {
                onResponse: async ({ result, network }) => {
                    const lastAssistantMessageText =
                        lastAssistantTextMessageContent(result);

                    if (lastAssistantMessageText && network) {
                        if (lastAssistantMessageText.includes("<task_summary>")) {
                            network.state.data.summary = lastAssistantMessageText;
                        }
                    }
                    return result;
                },
            }
        });

        const network = createNetwork<AgentState>({
            name: "coding-agent-network",
            agents: [codeAgent],
            maxIter: 15,
            defaultState: state,
            router: async ({ network }) => {
                const summary = network.state.data.summary;
                if (summary) {
                    return;
                }
                return codeAgent;
            }
        })

        const result = await network.run(event.data.value, { state });


        const fragmentTitleGenerator = createAgent({
            name: "fragment-title-generator",
            description: "generates title for fragments",
            system: PRESENTATION_FRAGMENT_TITLE_PROMPT,
            model: gemini({
                model: "gemini-1.5-flash-8b",
            }),
        });

        const responseGenerator = createAgent({
            name: "response-generator",
            description: "generates responses",
            system: PRESENTATION_RESPONSE_PROMPT,
            model: gemini({
                model: "gemini-1.5-flash-8b",
            }),
        });

        const { output: fragmentTitleOutput } = await fragmentTitleGenerator.run(result.state.data.summary);
        const { output: responseOutput } = await responseGenerator.run(result.state.data.summary);





        const hasDeck = !!result.state.data.files?.["public/deck.html"];
        const hasLanding = !!result.state.data.files?.["public/index.html"];
        const hasSummary = !!result.state.data.summary;

        console.log("summary:", result.state.data.summary);
        console.log("files:", Object.keys(result.state.data.files || {}));
        console.log("hasDeck:", hasDeck);
        console.log("hasLanding:", hasLanding);
        console.log("hasSummary:", hasSummary);

        // Only require deck and summgit stary - landing page is optional for presentations
        const isError = !(hasDeck && hasSummary);

        await step.run("start-static-server", async () => {
            const sandbox = await getSandbox(sandboxId);
            // Use your start_server.sh script instead
            await sandbox.commands.run('bash /start_server.sh &');
            return "ok";
        });

        const sandboxUrl = await step.run("get-sandbox-url", async () => {
            const sandbox = await Sandbox.connect(sandboxId);
            const host = sandbox.getHost(3000);
            return "https://" + host;
        });

        await step.run("save-result", async () => {
            if (isError) {
                return await prisma.message.create({
                    data: {
                        projectId: event.data.projectId,
                        content: `Something went wrong while running the code agent. Please try again!`,
                        role: "ASSISTANT",
                        type: "ERROR",
                    }
                });
            }

            return await prisma.message.create({
                data: {
                    projectId: event.data.projectId,
                    content: parseAgentOutput(responseOutput),
                    role: "ASSISTANT",
                    type: "RESULT",
                    fragment: {
                        create: {
                            sandboxUrl: sandboxUrl,
                            title: parseAgentOutput(fragmentTitleOutput),
                            files: result.state.data.files,
                        }
                    }
                }
            })
        });

        return {
            url: sandboxUrl,
            title: "Presentation",
            files: result.state.data.files,
            summary: result.state.data.summary,
        };
    },
);