
import { openai, gemini, createAgent, createTool, AnyZodType, createNetwork, type Tool, Message, createState } from "@inngest/agent-kit";
import { inngest } from "./client";
import { Sandbox } from "@e2b/code-interpreter";
import { getSandbox, lastAssistantTextMessageContent, parseAgentOutput } from "./utils";
import { z } from "zod";
import { PRESENTATION_FRAGMENT_TITLE_PROMPT, PRESENTATION_RESPONSE_PROMPT, PROMPT } from "@/prompt";
import { prisma } from "@/lib/db";
import { SANDBOX_TIMEOUT } from "./types";

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
            await sandbox.setTimeout(SANDBOX_TIMEOUT);
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

                take: 5,
            });

            for (const message of messages) {
                formattedMessages.push({
                    type: "text",
                    role: message.role === "ASSISTANT" ? "assistant" : "user",
                    content: message.content,
                })
            }

            return formattedMessages.reverse();
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
                model: "gemini-3.0-pro",
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
                    description: "Add a minimal download button that works reliably",
                    parameters: z.object({}),
                    handler: async ({ }, { step }) => {
                        return await step?.run("setupDownload", async () => {
                            try {
                                const sandbox = await getSandbox(sandboxId);

                                // Install required packages
                                await sandbox.commands.run('npm install archiver express --save');

                                // Create FIXED download server with proper error handling
                                const downloadServerScript = `
const express = require('express');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.static('public'));

app.get('/download', (req, res) => {
    console.log('Download request received');
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    // CRITICAL: Add error handling
    archive.on('error', (err) => {
        console.error('Archive error:', err);
        res.status(500).send('Archive error');
    });
    
    archive.on('end', () => {
        console.log('Archive finished - bytes:', archive.pointer());
    });
    
    // Set headers BEFORE piping
    res.attachment('presentation.zip');
    res.setHeader('Content-Type', 'application/zip');
    
    // Pipe archive to response
    archive.pipe(res);
    
    // Add files with proper checks
    try {
        if (fs.existsSync('public') && fs.statSync('public').isDirectory()) {
            const publicFiles = fs.readdirSync('public');
            console.log('Public files found:', publicFiles);
            if (publicFiles.length > 0) {
                archive.directory('public/', 'presentation/');
            } else {
                archive.append('No presentation files found', { name: 'presentation/readme.txt' });
            }
        } else {
            archive.append('Public directory not found', { name: 'error.txt' });
        }
        
        if (fs.existsSync('demo') && fs.statSync('demo').isDirectory()) {
            const demoFiles = fs.readdirSync('demo');
            console.log('Demo files found:', demoFiles);
            if (demoFiles.length > 0) {
                archive.directory('demo/', 'demo/');
            }
        }
        
        // Add basic readme
        const readme = \`# Presentation Download\\n\\nFiles included:\\n- presentation/ (main files)\\n- demo/ (if applicable)\\n\`;
        archive.append(readme, { name: 'README.md' });
        
    } catch (err) {
        console.error('File system error:', err);
        archive.append('Error reading files: ' + err.message, { name: 'error.txt' });
    }
    
    // CRITICAL: Finalize the archive
    archive.finalize();
});

// Start server with proper port handling
const port = process.env.PORT || 3001;
const server = app.listen(port, () => {
    console.log(\`Download server running on port \${port}\`);
});

// CRITICAL: Handle process termination properly
process.on('SIGTERM', () => {
    console.log('Download server shutting down');
    server.close();
});
`;

                                await sandbox.files.write('download-server.js', downloadServerScript);

                                // Simple, reliable download button
                                const downloadButtonHTML = `
<!-- Download Button -->
<div id="download-btn" onclick="downloadPresentation()" 
     title="Download Presentation"
     style="
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 999999;
        width: 44px;
        height: 44px;
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
     "
     onmouseover="this.style.transform='translateX(-50%) scale(1.1)'"
     onmouseout="this.style.transform='translateX(-50%) scale(1)'"
>
    <svg width="20" height="20" fill="white" viewBox="0 0 16 16">
        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
        <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
    </svg>
</div>

<script>
async function downloadPresentation() {
    const btn = document.getElementById('download-btn');
    btn.style.opacity = '0.5';
    
    try {
        const response = await fetch('/download');
        
        if (!response.ok) {
            throw new Error(\`HTTP \${response.status}\`);
        }
        
        const blob = await response.blob();
        console.log('Downloaded blob size:', blob.size);
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'presentation.zip';
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
    } catch (error) {
        console.error('Download failed:', error);
        alert('Download failed: ' + error.message);
    } finally {
        btn.style.opacity = '1';
    }
}
</script>
`;

                                // Add button to deck.html
                                const deckContent = await sandbox.files.read('public/deck.html');
                                const updatedContent = deckContent.replace('</body>', `${downloadButtonHTML}\n</body>`);
                                await sandbox.files.write('public/deck.html', updatedContent);

                                // Start server with timeout protection
                                await sandbox.commands.run('timeout 5s node download-server.js || node download-server.js &');

                                return `Download button added to presentation.`;

                            } catch (error) {
                                return `Error adding download button: ${error}`;
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