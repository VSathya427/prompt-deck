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
        const RawAsset = z.object({
            path: z.string().min(1),          // e.g., "public/styles/theme.css" or "public/images/bg.svg"
            content: z.string().default(""),  // raw file content
        });
        const CreatePresentationRaw = z.object({
            mode: z.literal("raw"),
            deckHtml: z.string().min(1),        // full <!doctype html>... for public/deck.html
            landingPageTsx: z.string().min(1),  // full "use client" React component for app/page.tsx
            assets: z.array(RawAsset).optional()// optional extra files
        });
        const codeAgent = createAgent<AgentState>({
            name: "code-agent",
            description: "A code agent that can create interactive presentations using HTML, CSS, JavaScript and presentation frameworks like Reveal.js in a sandboxed environment.",
            system: `${PROMPT}\n\nFocus on creating presentations instead of websites. Use frameworks like Reveal.js, Impress.js, or create custom HTML/CSS/JS presentations with smooth animations and professional layouts. Always wrap your final summary in <task_summary> tags.`,
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
                    description: "Create or update presentation files including React components, styles, and interactive elements with export capabilities.",
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
                    description:
                        "Write a complete Impress.js deck (public/deck.html) and a themed landing page (app/page.tsx). RAW mode only.",
                    parameters: CreatePresentationRaw as unknown as AnyZodType,
                    handler: async (params, { step, network }) => {
                        return await step!.run("createPresentation(raw)", async () => {
                            // Guard: enforce RAW mode
                            if (params.mode !== "raw") {
                                throw new Error('createPresentation only supports mode: "raw"');
                            }

                            const sandbox = await getSandbox(sandboxId); // assumes sandboxId in outer scope
                            const files = { ...(network.state.data.files || {}) };

                            // 1) Write deck.html
                            await sandbox.files.write("public/deck.html", params.deckHtml);
                            files["public/deck.html"] = params.deckHtml;

                            // 2) Write landing page
                            await sandbox.files.write("app/page.tsx", params.landingPageTsx);
                            files["app/page.tsx"] = params.landingPageTsx;

                            // 3) Optional extra assets (safe iterate)
                            const assets = Array.isArray(params.assets) ? params.assets : [];
                            for (const asset of assets) {
                                // allow only safe roots
                                if (
                                    asset.path.startsWith("public/") ||
                                    asset.path.startsWith("app/") ||
                                    asset.path.startsWith("styles/") ||
                                    asset.path.startsWith("lib/")
                                ) {
                                    await sandbox.files.write(asset.path, asset.content ?? "");
                                    files[asset.path] = asset.content ?? "";
                                } else {
                                    // ignore silently or console.warn if you prefer
                                    // console.warn(`[createPresentation] Skipping unsafe path: ${asset.path}`);
                                }
                            }

                            network.state.data.files = files;
                            return "/deck.html";
                        });
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
        
        const isError =
            !result.state.data.summary ||
            Object.keys(result.state.data.files || {}).length === 0;

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
                        content: "Something went wrong while running the code agent.",
                        role: "ASSISTANT",
                        type: "ERROR",
                    }
                });
            }
            await prisma.message.create({
                data: {
                    content: result.state.data.summary || "No summary provided",
                    role: "ASSISTANT",
                    type: "RESULT",
                    fragment: {
                        create: {
                            sandboxUrl: sandboxUrl,
                            title: "Presentation",
                            files: result.state.data.files || {},
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