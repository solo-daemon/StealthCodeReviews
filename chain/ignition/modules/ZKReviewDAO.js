const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const ZKReviewDAOModule = buildModule("ZKReviewDAOModule", (m) => {
  // Deploy a mock ERC20 token for testing purposes
  const mockToken = m.contract("MockERC20", ["Mock Token", "MCK", 18]);

  // Deploy the ZKReviewDAO contract
  const zkReviewDAO = m.contract("ZKReviewDAO", [mockToken]);

  // Deploy the GitHubBot contract
  const gitHubBot = m.contract("GitHubBot", []);


  return { zkReviewDAO, mockToken, gitHubBot };
});

module.exports = ZKReviewDAOModule;