// Test script to verify OpenRouter integration works
import { generateText } from "ai";
import { customModelProvider } from "../src/lib/ai/models";

async function testOpenRouterModel() {
  try {
    console.log("Testing OpenRouter model...");

    // Test with an OpenRouter model
    const model = customModelProvider.getModel({
      provider: "openRouter",
      model: "qwen3-8b:free",
    });

    const result = await generateText({
      model,
      prompt: "Say hello",
      maxTokens: 10,
    });

    console.log("Success! Generated text:", result.text);
    return true;
  } catch (error) {
    console.error("Error:", error.message);
    return false;
  }
}

// Run the test
testOpenRouterModel()
  .then((success) => {
    console.log(success ? "✅ Test passed" : "❌ Test failed");
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("❌ Test failed with error:", error);
    process.exit(1);
  });
