const { dependencies = {} } = require("../package.json");
const requiredPackages = Object.keys(dependencies);

const missingPackages = requiredPackages.filter((packageName) => {
  try {
    require.resolve(packageName);
    return false;
  } catch (error) {
    if (error.code === "MODULE_NOT_FOUND") {
      return true;
    }
    throw error;
  }
});

if (missingPackages.length > 0) {
  console.error(
    "Missing required dependencies: %s.\nRun \"npm install\" inside MES-Kryptonit-Server-master.",
    missingPackages.join(", ")
  );
  process.exit(1);
}
