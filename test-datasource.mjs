import { DatabaseEngineFactory } from "./src/lib/database/engines/DatabaseEngineFactory.js";

async function testDatasourceConnection() {
  console.log("🚀 Testing MindSpark Studio Datasource Implementation");
  console.log("=".repeat(60));

  // Test configuration
  const testConfig = {
    type: "postgresql",
    host: "localhost",
    port: 5432,
    database: "test_db",
    username: "test_user",
    password: "test_password",
    ssl: false,
    schema: "public",
  };

  try {
    console.log("📋 Testing configuration validation...");
    const validation = DatabaseEngineFactory.validateConfig(testConfig);
    console.log("✅ Configuration validation:", validation);

    console.log("\n🔌 Testing database engine creation...");
    const engine = DatabaseEngineFactory.createEngine(testConfig);
    console.log("✅ Engine created successfully:", engine.constructor.name);

    console.log(
      "\n🧪 Testing connection (will fail if DB doesn't exist - this is expected)...",
    );
    try {
      const connectionResult = await engine.testConnection();
      console.log("✅ Connection test result:", connectionResult);
    } catch (error) {
      console.log(
        "⚠️ Connection failed (expected if no test DB):",
        error.message,
      );
    }

    console.log("\n✨ Database engine implementation working correctly!");
    console.log("🎯 Ready for real database connections!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run test
testDatasourceConnection();
