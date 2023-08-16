// main.ts
import "./styles/styles.css";

// declare const CodeMirror: any; // Obsidian uses CodeMirror for text editing. This just declares it for TypeScript
import "tslib";

import {
  App,
  EditorPosition,
  MarkdownView,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";

export default class SlackCleaner extends Plugin {
  debugging = true;

  async onload() {
    console.log("loading New Zettel");
    this.addCommand({
      id: "clean-slack-data",
      name: "Clean Slack Data from Clipboard",
      callback: this.cleanData.bind(this),
    });
  }

  async cleanData(): Promise<void> {
    const clipboardItems = await navigator.clipboard.read();

    let plainText = "";
    let htmlText = "";

    for (const clipboardItem of clipboardItems) {
      if (clipboardItem.types.includes("text/plain")) {
        plainText = await (await clipboardItem.getType("text/plain")).text();
      }
      if (clipboardItem.types.includes("text/html")) {
        htmlText = await (await clipboardItem.getType("text/html")).text();
      }
    }

    if (!htmlText) {
      new Notice("Clipboard does not appear to be slack data.");
      return;
    }

    // console.log('Clipboard data', plainText, '|HTML|', htmlText);
    const cleanedData = this.cleanSlackText(htmlText);
    // Assuming you want to replace the current selection with cleaned data
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return;

    const editor = view.editor;
    if (!editor) return;

    console.log("cleaned data", cleanedData);

    // Add '> ' to the start of each line of cleaned messages
    const formattedMessages = cleanedData.map(
      (msg) => `> ${msg.replace(/\n/g, "\n> ")}`
    );

    // Join the formatted messages
    const cleanedText = formattedMessages.join("\n> \n");

    editor.replaceSelection(`> [!chatlog] Slack Chat\n>\n${cleanedText}`);
  }

  cleanSlackText(htmlData: string): string[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlData, "text/html");
    console.log(doc.body.innerHTML); // This should print out your HTML. If not, there's a problem with the parsing.

    // Array to collect cleaned messages
    const cleanedMessages: string[] = [];

    // Loop over each message item
    const messageContainers = doc.querySelectorAll(
      'div[data-qa="message_content"]'
    );
    this.debugging && console.log("messageContainers", messageContainers);
    messageContainers.forEach((container) => {
      // Extracting the username
      const usernameElem = container.querySelector(".c-message__sender_button");
      console.log("usernameElem", usernameElem?.textContent);
      const username = usernameElem?.textContent?.trim() || "";

      // Extracting the timestamp and its link
      const timestampElem = container.querySelector(".c-timestamp__label");
      this.debugging &&
        console.log("timestampElem", timestampElem?.textContent);

      const timestampLinkElem = container.querySelector(".c-timestamp");

      // Attempt to get the timestamp from the data-ts attribute
      const timestampData = timestampLinkElem?.getAttribute("data-ts");
      const timestampNumber = timestampData ? parseFloat(timestampData) : false;

      const timestamp = timestampNumber
        ? unixTimestampToDate(timestampNumber)
        : timestampLinkElem?.getAttribute("aria-label")?.trim() ||
          timestampElem?.textContent?.trim() ||
          "";
      this.debugging &&
        console.log(
          "timestampLinkElem",
          timestampLinkElem?.getAttribute("href")
        );
      const timestampLink = timestampLinkElem?.getAttribute("href") || "";

      // Extracting the message content
      const messageElem = container.querySelector(".p-rich_text_section");
      this.debugging && console.log("messageElem", messageElem?.textContent);
      const message = messageElem?.textContent?.trim() || "";

      // Adding the cleaned message to the array
      const markdownMessage = `> [!chatmsg] ${username} [${timestamp}](${timestampLink})\n> ${message.replace(
        /\n/g,
        "\n> "
      )}`;
      cleanedMessages.push(markdownMessage);
      console.log("found msg", markdownMessage);
    });

    return cleanedMessages;
  }
}

function unixTimestampToDate(timestamp: number): string {
  const date = new Date(timestamp * 1000); // Convert to milliseconds and create a Date object

  // Extract date components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Add 1 since months are 0-indexed
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours() % 12).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const ampm = date.getHours() >= 12 ? "PM" : "AM";

  // Format the string
  return `${year}/${month}/${day} at ${hours}:${minutes}:${seconds} ${ampm}`;
}
