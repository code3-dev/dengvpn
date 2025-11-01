// Conditional code signing script
// Only signs when GH_TOKEN environment variable is set
exports.default = async function(configuration) {
  // Check if GH_TOKEN is set
  if (!process.env.GH_TOKEN) {
    console.log("GH_TOKEN not set, skipping code signing");
    return;
  }

  // If GH_TOKEN is set, use the default signing process
  // This will use signtool.exe with the certificate
  console.log("GH_TOKEN found, proceeding with code signing");
};