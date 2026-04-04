import { createAnthropic } from "@ai-sdk/anthropic";
import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const myProvider = isTestEnvironment
  ? (() => {
      const { chatModel, titleModel } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": titleModel,
        },
      });
    })()
  : null;

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  // Strip provider prefix (e.g. "anthropic/claude-sonnet-4-6" -> "claude-sonnet-4-6")
  const id = modelId.includes("/")
    ? modelId.split("/").slice(1).join("/")
    : modelId;
  return anthropic(id);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return anthropic("claude-haiku-4-5-20251001");
}
