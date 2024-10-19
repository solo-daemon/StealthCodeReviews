const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const ZKSystemModule = buildModule("ZKSystemModule", (m) => {
  // Deploy a mock ERC20 token for testing purposes
  const mockToken = m.contract("MockERC20", ["Mock Token", "MCK", 18]);

  // Deploy the ZKReviewDAO contract
  const zkReviewDAO = m.contract("ZKReviewDAO", [mockToken]);

  // Deploy the GitHubBot contract
  const gitHubBot = m.contract("GitHubBot", []);

  // Deploy the ZKCodeReview contract
  const zkCodeReview = m.contract("ZKCodeReview", [zkReviewDAO]);

  // Set up connections between contracts
  m.call(zkReviewDAO, "setZKReviewContract", [zkCodeReview]);
  m.call(zkReviewDAO, "setGithubBot", [gitHubBot]);
  m.call(gitHubBot, "setZKReviewDAO", [zkReviewDAO]);

  // Note: We're not adding verifiers here. This should be done post-deployment by the contract owner.

  return { zkReviewDAO, mockToken, gitHubBot, zkCodeReview };
});

module.exports = ZKSystemModule;