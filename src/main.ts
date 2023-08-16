// main.ts
import "./styles/styles.css";

// declare const CodeMirror: any; // Obsidian uses CodeMirror for text editing. This just declares it for TypeScript
import 'tslib';

export default class SlackCleaner {
    private app: any;

    constructor(app: any) {
        this.app = app;
    }

    onload() {
        this.app.commands.addCommand({
            id: 'clean-slack-data',
            name: 'Clean Slack Data from Clipboard',
            callback: this.cleanData.bind(this)
        });
    }

    async cleanData(): Promise<void> {
        const clipboardData = await navigator.clipboard.readText();
        const cleanedData = this.cleanSlackText(clipboardData);
        // Assuming you want to replace the current selection with cleaned data
        const editor = this.app.workspace.getActiveLeaf().openState.editor;
        editor.replaceSelection(cleanedData);
    }

    cleanSlackText(rawData: string): string {
        // Remove slack image lines
        const lines = rawData.split('\n').filter(line => !line.trim().startsWith('![]('));

        // Remove slack emojis
        const cleanedLines = lines.map(line => line.replace(/!\[.*?\]\(https:\/\/.*?\)/g, ''));

        return cleanedLines.join('\n');
    }
};
