// import { openai, gemini, createAgent, createTool, AnyZodType, createNetwork, type Tool } from "@inngest/agent-kit";
// import { inngest } from "./client";
// import { Sandbox } from "@e2b/code-interpreter";
// import { getSandbox, lastAssistantTextMessageContent } from "./utils";
// import { z } from "zod";
// import { PROMPT } from "@/prompt";
// import { prisma } from "@/lib/db";

// interface AgentState {
//     summary: string;
//     files: { [path: string]: string };
// };

// export const codeAgentFunction = inngest.createFunction(
//     { id: "code-agent" },
//     { event: "code-agent/run" },
//     async ({ event, step }) => {
//         const sandboxId =  await step.run("get-sandbox-id", async () => {
//             const sandbox = await Sandbox.create("prompt-deck-test-2");
//             return sandbox.sandboxId;
//         });
//             const codeAgent = createAgent<AgentState>({
//             name: "code-agent",
//             description: "A code agent that can write and modify code in a sandboxed Next.js environment.",
//             system: PROMPT,
//             model: gemini({
//                 model:"gemini-2.5-pro",
//                 defaultParameters: { generationConfig: { temperature: 0.1 } },
//             }),
//             // model: openai({ model: "gpt-4o" }),
//             tools: [
//                 createTool({
//                     name: "terminal",
//                     description: "Use the terminal to run commands in the sandbox.",
//                     parameters: z.object({
//                         command: z.string(),
//                     }) as unknown as AnyZodType,
//                     handler: async ({ command }, { step }) => {
//                         return await step?.run("terminal",async () => {
//                             const buffers = {stdout:"", stderr:""};
//                             try {
//                                 const sandbox = await getSandbox(sandboxId);
//                                 const result = await sandbox.commands.run(command, {
//                                     onStdout(data: string) {
//                                         buffers.stdout += data;
//                                     },
//                                     onStderr(data: string) {
//                                         buffers.stderr += data;
//                                     },
//                                 });
//                                 return result.stdout;
//                             } catch (error) {
//                                 console.error(
//                                     `Command failed: ${error} \nstdoud: ${buffers.stdout} \nstderr: ${buffers.stderr}`,
//                                 );
//                                 return `Command failed: ${error} \nstdoud: ${buffers.stdout} \nstderr: ${buffers.stderr}`;
//                             }
//                         });
//                     }
//                 }),
//                 createTool({
//                     name: "createOrUpdateFile",
//                     description: "Create or update a file in the sandbox.",
//                     parameters: z.object({
//                         files: z.array(
//                             z.object({
//                                 path: z.string(),
//                                 content: z.string(),
//                             }),
//                         )
//                     }),
//                     handler: async ({ files }, { step, network }: Tool.Options<AgentState>) => {
//                         const newFiles = await step?.run("createOrUpdateFiles", async () => {
//                             try {
//                                 const updatedFiles = network.state.data.files || {};
//                                 const sandbox = await getSandbox(sandboxId);
//                                 for (const file of files) {
//                                     await sandbox.files.write(file.path, file.content);
//                                     updatedFiles[file.path] = file.content;
//                                 }
//                                 return updatedFiles;
//                             } catch (error) {
//                                 return "Error :"+error;
//                             }
//                         });
//                         if(typeof newFiles === "object") {
//                             network.state.data.files = newFiles;
//                         }
//                     }
//                 }),
//                 createTool({
//                     name: "readFiles",
//                     description: "Read a file from the sandbox.",
//                     parameters: z.object({
//                         files: z.array(z.string()),
//                     }),
//                     handler: async ({ files }, { step }) => {
//                         return await step?.run("readFiles", async () => {
//                             try {
//                                 const sandbox = await getSandbox(sandboxId);
//                                 const contents = [];
//                                 for (const file of files) {
//                                     const content = await sandbox.files.read(file);
//                                     contents.push({ path: file, content });
//                                 }
//                                 return JSON.stringify(contents);
//                             } catch (error) {
//                                 return "Error reading files: " + error;
//                             }
//                         })
//                     },
//                 }),
//             ],
//             lifecycle:{
//                 onResponse: async ( { result, network }) => {
//                     const lastAssistantMessageText = 
//                      lastAssistantTextMessageContent(result);

//                     if(lastAssistantMessageText && network){
//                         if(lastAssistantMessageText.includes("<task_summary>")){
//                             network.state.data.summary = lastAssistantMessageText;
//                         }
//                     }
//                     return result;
//                 },
//             }
//         });

//         const network = createNetwork<AgentState>({
//             name: "coding-agent-network",
//             agents: [codeAgent],
//             maxIter: 15,
//             router: async ({network}) => {
//                 const summary = network.state.data.summary;
//                 if(summary){
//                     return;
//                 }
//                 return codeAgent;
//             }
//         })

//         const result = await network.run(event.data.value);
//         const isError = 
//             !result.state.data.summary ||
//             Object.keys(result.state.data.files || {}).length === 0;

//         const sandboxUrl = await step.run("get-sandbox-url", async () => {
//             const sandbox = await Sandbox.connect(sandboxId);
//             const host = sandbox.getHost(3000);
//             return "https://"+host;
//         });

//         await step.run("save-result", async () => {
//             if(isError) {
//                 return await prisma.message.create({
//                     data:{
//                         content: "Somthing went wrong while running the code agent.",
//                         role: "ASSISTANT",
//                         type: "ERROR",
//                     }
//                 });
//             }
//             await prisma.message.create({
//                 data: {
//                     content: result.state.data.summary || "No summary provided",
//                     role: "ASSISTANT",
//                     type: "RESULT",
//                     fragment: {
//                         create: {
//                             sandboxUrl: sandboxUrl,
//                             title: "Fragment",
//                             files: result.state.data.files || {},
//                         }
//                     }
//                 }
//             })
//         });

//         return { 
//             url: sandboxUrl,
//             title: "Fragment",
//             files: result.state.data.files,
//             summary: result.state.data.summary,
//          };
//     },
// );

import { openai, gemini, createAgent, createTool, AnyZodType, createNetwork, type Tool } from "@inngest/agent-kit";
import { inngest } from "./client";
import { Sandbox } from "@e2b/code-interpreter";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { z } from "zod";
import { PROMPT } from "@/prompt";
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
            const sandbox = await Sandbox.create("prompt-deck-test-2");
            return sandbox.sandboxId;
        });

        const CreatePresentationSchema = z.object({
            deckHtml: z.string().min(1),  // full <!doctype html>... for public/deck.html
        });

        const codeAgent = createAgent<AgentState>({
            name: "code-agent",
            description: "A code agent that can create interactive presentations using HTML, CSS, JavaScript and presentation frameworks like Reveal.js in a sandboxed environment.",
            system: `${PROMPT}.`,
            model: gemini({
                model: "gemini-2.5-pro",
                defaultParameters: { generationConfig: { temperature: 0.1 } },
            }),
            // model: openai({ model: "gpt-4o" }),
            tools: [
                createTool({
                    name: "terminal",
                    description: "Use the terminal to run commands in the sandbox for setting up presentation frameworks and dependencies.",
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
                    description: "Create or update files including React components, styles, and other project files.",
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
                                return "Error :" + error;
                            }
                        });
                        if (typeof newFiles === "object") {
                            network.state.data.files = newFiles;
                        }
                    }
                }),
                createTool({
                    name: "setupExportCapabilities",
                    description: "Install and configure packages for PDF and PPTX export functionality.",
                    parameters: z.object({
                        exportFormats: z.array(z.enum(['pdf', 'pptx', 'both'])),
                    }),
                    handler: async ({ exportFormats }, { step }) => {
                        return await step?.run("setupExport", async () => {
                            try {
                                const sandbox = await getSandbox(sandboxId);
                                const commands = [];

                                // Base packages for export functionality
                                if (exportFormats.includes('pdf') || exportFormats.includes('both')) {
                                    commands.push('npm install html2canvas jspdf --yes');
                                    commands.push('npm install puppeteer-core --yes');
                                }

                                if (exportFormats.includes('pptx') || exportFormats.includes('both')) {
                                    commands.push('npm install pptxgenjs --yes');
                                    commands.push('npm install file-saver --yes');
                                }

                                // Interactive presentation packages
                                commands.push('npm install framer-motion --yes');
                                commands.push('npm install react-spring --yes');
                                commands.push('npm install @types/file-saver --yes');

                                let results = [];
                                for (const command of commands) {
                                    const result = await sandbox.commands.run(command);
                                    results.push(result.stdout);
                                }

                                return `Export packages installed:\n${results.join('\n')}`;
                            } catch (error) {
                                return `Error installing export packages: ${error}`;
                            }
                        });
                    }
                }),
                createTool({
                    name: "readFiles",
                    description: "Read presentation files from the sandbox to review or modify existing content.",
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
                createTool({
                    name: "createPresentation",
                    description: "Create a complete Impress.js presentation deck and write it to public/deck.html",
                    parameters: CreatePresentationSchema as unknown as AnyZodType,
                    handler: async ({ deckHtml }, { step, network }: Tool.Options<AgentState>) => {
                        const newFiles = await step!.run("createPresentation", async () => {
                            try {
                                const updatedFiles = network.state.data.files || {};
                                const sandbox = await getSandbox(sandboxId);

                                // Write deck.html
                                await sandbox.files.write("public/deck.html", deckHtml);
                                updatedFiles["public/deck.html"] = deckHtml;

                                return updatedFiles;
                            } catch (error) {
                                return "Error: " + error;
                            }
                        });

                        if (typeof newFiles === "object") {
                            network.state.data.files = newFiles;
                        }

                        return "Presentation deck created at /deck.html";
                    },
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
            router: async ({ network }) => {
                const summary = network.state.data.summary;
                if (summary) {
                    return;
                }
                return codeAgent;
            }
        })

        const result = await network.run(event.data.value);


        const hasDeck = !!result.state.data.files?.["public/deck.html"];
        const hasLanding = !!result.state.data.files?.["app/page.tsx"];
        const hasSummary = !!result.state.data.summary;

        console.log("summary:", result.state.data.summary);
        console.log("files:", Object.keys(result.state.data.files || {}));
        console.log("hasDeck:", hasDeck);
        console.log("hasLanding:", hasLanding);
        console.log("hasSummary:", hasSummary);

        // Only require deck and summary - landing page is optional for presentations
        const isError = !(hasDeck && hasSummary);

        await step.run("start-static-server", async () => {
            const sandbox = await getSandbox(sandboxId);
            await sandbox.commands.run(
                'bash -lc "pgrep -f \\"http-server public -p 3000\\" || (npx --yes http-server public -p 3000 -a 0.0.0.0 >/tmp/http.log 2>&1 &)"'
            );
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
                    content: result.state.data.summary,
                    role: "ASSISTANT",
                    type: "RESULT",
                    fragment: {
                        create: {
                            sandboxUrl: sandboxUrl,
                            title: "Presentation",
                            files: result.state.data.files,
                        }
                    }
                }
            })
        });

        return {
            url: sandboxUrl + "/deck.html",
            title: "Presentation",
            files: result.state.data.files,
            summary: result.state.data.summary,
        };
    },
);