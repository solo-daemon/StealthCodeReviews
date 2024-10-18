import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import config from './config.json';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('DevLaunchpad extension is now active!');

	const disposable = vscode.commands.registerCommand('devlaunchpad.generateDevContainer', async () => {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('No workspace folder found. Please open a project folder.');
			return;
		}

		try {
			const projectInfo = await analyzeProject(workspaceFolder.uri.fsPath);
			const devContainerJson = await generateDevContainerJson(projectInfo);
			await saveDevContainerJson(workspaceFolder.uri.fsPath, devContainerJson);
			vscode.window.showInformationMessage('.devcontainer.json generated successfully!');
		} catch (error) {
			vscode.window.showErrorMessage(`Error generating .devcontainer.json: ${error}`);
		}
	});

	context.subscriptions.push(disposable);
}

async function analyzeProject(projectPath: string): Promise<ProjectInfo> {
	const languages: Set<string> = new Set();
	const manifests: string[] = [];
	const configFiles: string[] = [];

	const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
	
	for (const file of files) {
		const fileName = path.basename(file.fsPath);
		const extension = path.extname(file.fsPath).toLowerCase();

		// Check for manifest files
		if (config.manifestFiles[fileName]) {
			manifests.push(fileName);
			languages.add(config.manifestFiles[fileName]);
		}

		// Check file extensions
		if (config.fileExtensions[extension]) {
			languages.add(config.fileExtensions[extension]);
		}

		// Check for config files
		if (config.configFiles.includes(fileName)) {
			configFiles.push(fileName);
		}
	}

	return { 
		languages: Array.from(languages), 
		manifests, 
		configFiles 
	};
}

async function generateDevContainerJson(projectInfo: ProjectInfo): Promise<string> {
	const prompt = `
	Generate a .devcontainer.json file for a project with the following characteristics:
	Languages: ${projectInfo.languages.join(', ')}
	Manifest files: ${projectInfo.manifests.join(', ')}
	Config files: ${projectInfo.configFiles.join(', ')}

	The .devcontainer.json should include:
	1. An appropriate base image that supports all detected languages
	2. Necessary VS Code extensions for the detected languages and config files
	3. Required features (e.g., specific language runtimes)
	4. Post-create commands for setting up the development environment, including installing dependencies from the manifest files
	5. Any other relevant configurations based on the project structure

	Ensure that the generated configuration is ready to launch, with all necessary dependencies and tools installed.
	Provide the response as a valid JSON object.
	`;

	try {
		const response = await openai.chat.completions.create({
			model: "gpt-3.5-turbo",
			messages: [{ role: "user", content: prompt }],
			temperature: 0.7,
			max_tokens: 1500,
		});

		const generatedJson = response.choices[0].message.content;
		return generatedJson ? generatedJson : '{}';
	} catch (error) {
		console.error('Error calling OpenAI API:', error);
		throw new Error('Failed to generate .devcontainer.json using AI');
	}
}

async function saveDevContainerJson(projectPath: string, content: string): Promise<void> {
	const devContainerPath = path.join(projectPath, '.devcontainer');
	const devContainerJsonPath = path.join(devContainerPath, 'devcontainer.json');

	if (!fs.existsSync(devContainerPath)) {
		fs.mkdirSync(devContainerPath);
	}

	fs.writeFileSync(devContainerJsonPath, content);
}

export function deactivate() {}

interface ProjectInfo {
	languages: string[];
	manifests: string[];
	configFiles: string[];
}
