async function main(): Promise<void> {
  const { loadEnvForTest } = await import("./loadEnv");
  loadEnvForTest();

  await import("./unit.schema.test");
  await import("./integration.pipeline.test");
  await import("./system.route.test");

  const { run } = await import("./assert");
  await run();
}

void main();
