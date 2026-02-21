#!/usr/bin/env node

const { execSync } = require("child_process");
const os = require("os");
const fs = require("fs");

// Check if running in production/docker/CI environment
const isProductionOrDocker = () => {
  // Check environment variables
  if (process.env.NODE_ENV === "production") return true;
  if (process.env.npm_config_production === "true") return true;
  if (process.env.CI === "true") return true;
  if (process.env.DOCKER === "true") return true;

  // Check command line arguments
  const args = process.argv.join(" ");
  if (args.includes("--production")) return true;

  // Check if we're in a Docker environment
  try {
    if (fs.existsSync("/.dockerenv")) return true;
    if (fs.existsSync("/proc/1/cgroup") && fs.readFileSync("/proc/1/cgroup", "utf8").includes("docker")) {
      return true;
    }
  } catch (e) {
    // Ignore file system errors
  }

  return false;
};

// Skip in production/Docker/CI environments
if (isProductionOrDocker()) {
  console.log("Production/Docker/CI environment detected, skipping platform-specific dependencies.");
  process.exit(0);
}

// Continue with swc dependency installation
const platform = os.platform();
const arch = os.arch();

console.log(`Detected platform: ${platform}, architecture: ${arch}`);

// Map of platform+arch to SWC package
const packageMap = {
  "darwin-arm64": "@swc/core-darwin-arm64",
  "darwin-x64": "@swc/core-darwin-x64",
  "linux-x64": "@swc/core-linux-x64-gnu",
  "win32-x64": "@swc/core-win32-x64-msvc",
};

const key = `${platform}-${arch}`;
const packageToInstall = packageMap[key];

if (packageToInstall) {
  // Check if package is already installed
  try {
    require.resolve(packageToInstall);
    console.log(`${packageToInstall} is already installed.`);
  } catch (e) {
    // Package not found, install it
    console.log(`Installing ${packageToInstall} for your platform...`);
    try {
      execSync(`pnpm add -D ${packageToInstall}`, { stdio: "inherit" });
      console.log(`Successfully installed ${packageToInstall}`);
    } catch (error) {
      console.error(`Failed to install ${packageToInstall}:`, error.message);
      // Don't exit with error to allow builds to continue
      console.log("Continuing with build process...");
    }
  }
} else {
  console.log(`No specific SWC package found for ${key}. Using default implementation.`);
}
