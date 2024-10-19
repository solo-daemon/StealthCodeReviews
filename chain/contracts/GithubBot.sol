// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IZKReviewDAO {
    function releaseFullBounty(uint256 issueId) external;
}

contract GitHubBot is Ownable, Pausable {
    IZKReviewDAO public zkReviewDAO;
    
    struct Issue {
        uint256 issueId;
        address contributor;
        bool verified;
        uint256 verificationTimestamp;
    }
    
    mapping(uint256 => Issue) public issues;
    mapping(address => bool) public authorizedVerifiers;
    
    uint256 public constant VERIFICATION_COOLDOWN = 1 days;
    
    event IssueVerified(uint256 indexed issueId, address contributor, address verifier);
    event VerifierAdded(address verifier);
    event VerifierRemoved(address verifier);
    event BountyReleaseTriggered(uint256 indexed issueId, address contributor);

    constructor() Ownable(msg.sender) {
        authorizedVerifiers[msg.sender] = true;
    }

    modifier onlyVerifier() {
        require(authorizedVerifiers[msg.sender], "Caller is not an authorized verifier");
        _;
    }

    function setZKReviewDAO(address _zkReviewDAO) external onlyOwner {
        zkReviewDAO = IZKReviewDAO(_zkReviewDAO);
    }

    function addVerifier(address verifier) external onlyOwner {
        require(verifier != address(0), "Invalid verifier address");
        require(!authorizedVerifiers[verifier], "Verifier already authorized");
        authorizedVerifiers[verifier] = true;
        emit VerifierAdded(verifier);
    }

    function removeVerifier(address verifier) external onlyOwner {
        require(authorizedVerifiers[verifier], "Verifier not authorized");
        authorizedVerifiers[verifier] = false;
        emit VerifierRemoved(verifier);
    }

    function verifyIssue(uint256 issueId, address contributor) external onlyVerifier whenNotPaused {
        require(contributor != address(0), "Invalid contributor address");
        require(!issues[issueId].verified, "Issue already verified");
        
        issues[issueId] = Issue({
            issueId: issueId,
            contributor: contributor,
            verified: true,
            verificationTimestamp: block.timestamp
        });
        
        emit IssueVerified(issueId, contributor, msg.sender);
    }

    function triggerBountyRelease(uint256 issueId) external onlyVerifier whenNotPaused {
        Issue storage issue = issues[issueId];
        require(issue.verified, "Issue not verified");
        require(block.timestamp >= issue.verificationTimestamp + VERIFICATION_COOLDOWN, "Verification cooldown period not elapsed");
        
        zkReviewDAO.releaseFullBounty(issueId);
        
        emit BountyReleaseTriggered(issueId, issue.contributor);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getIssueDetails(uint256 issueId) external view returns (uint256, address, bool, uint256) {
        Issue memory issue = issues[issueId];
        return (issue.issueId, issue.contributor, issue.verified, issue.verificationTimestamp);
    }

    function isVerifier(address account) external view returns (bool) {
        return authorizedVerifiers[account];
    }
}