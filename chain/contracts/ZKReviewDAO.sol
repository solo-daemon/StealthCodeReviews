// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ZKReviewDAO is Ownable {
    IERC20 public token;
    address public zkReviewContract;
    address public githubBot;

    struct Bounty {
        uint256 total;
        uint256 released;
        uint256 timelock;
        address contributor;
        bool fullyReleased;
    }

    mapping(uint256 => Bounty) public bounties;

    uint256 public constant PARTIAL_RELEASE_PERCENT = 30;
    uint256 public constant TIMELOCK_DURATION = 30 days;

    event BountyInitiated(uint256 indexed issueId, uint256 total);
    event PartialBountyReleased(uint256 indexed issueId, address contributor, uint256 amount);
    event FullBountyReleased(uint256 indexed issueId, address contributor, uint256 amount);

    constructor(IERC20 _token) Ownable(msg.sender) {
        token = _token;
    }

    function setZKReviewContract(address _zkReviewContract) external onlyOwner {
        zkReviewContract = _zkReviewContract;
    }

    function setGithubBot(address _githubBot) external onlyOwner {
        githubBot = _githubBot;
    }

    function initiateBounty(uint256 issueId, uint256 amount) external {
        require(msg.sender == zkReviewContract, "Only ZKReview contract can initiate bounties");
        bounties[issueId] = Bounty({
            total: amount,
            released: 0,
            timelock: 0,
            contributor: address(0),
            fullyReleased: false
        });
        emit BountyInitiated(issueId, amount);
    }

    function releaseBounty(uint256 issueId, address contributor) external {
        require(msg.sender == zkReviewContract, "Only ZKReview contract can release bounties");
        Bounty storage bounty = bounties[issueId];
        require(bounty.contributor == address(0), "Bounty already assigned");

        uint256 partialAmount = (bounty.total * PARTIAL_RELEASE_PERCENT) / 100;
        bounty.released = partialAmount;
        bounty.timelock = block.timestamp + TIMELOCK_DURATION;
        bounty.contributor = contributor;

        require(token.transfer(contributor, partialAmount), "Token transfer failed");
        emit PartialBountyReleased(issueId, contributor, partialAmount);
    }

    function releaseFullBounty(uint256 issueId) external {
        Bounty storage bounty = bounties[issueId];
        require(msg.sender == bounty.contributor || msg.sender == githubBot, "Only the contributor or GitHub bot can release the full bounty");
        require(block.timestamp >= bounty.timelock, "Timelock period not over");
        require(!bounty.fullyReleased, "Bounty already fully released");

        uint256 remainingAmount = bounty.total - bounty.released;
        bounty.released = bounty.total;
        bounty.fullyReleased = true;

        require(token.transfer(bounty.contributor, remainingAmount), "Token transfer failed");
        emit FullBountyReleased(issueId, bounty.contributor, remainingAmount);
    }

    function refundBounty(uint256 issueId) external onlyOwner {
        Bounty storage bounty = bounties[issueId];
        require(block.timestamp >= bounty.timelock, "Timelock period not over");
        require(!bounty.fullyReleased, "Bounty already fully released");

        uint256 remainingAmount = bounty.total - bounty.released;
        bounty.fullyReleased = true;

        require(token.transfer(owner(), remainingAmount), "Token transfer failed");
    }
}