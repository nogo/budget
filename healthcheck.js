async function healthcheck() {
  try {
    const response = await fetch("http://localhost:3000/api/health");
    if (!response.ok) {
      throw new Error(`Health check failed with status: ${response.status}`);
    }
    console.log("Health check passed");
    process.exit(0);
  } catch (error) {
    console.error("Health check failed:", error.message);
    process.exit(1);
  }
}

healthcheck();
