// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[1] memory input
    ) external view returns (bool);
}

contract ZKCodeReviewToken {
    mapping(address => uint256) public balances;
    mapping(address => uint256) public reputation;
    
    function mint(address to, uint256 amount) internal {
        balances[to] += amount;
    }
    
    function addReputation(address user, uint256 amount) internal {
        reputation[user] += amount;
    }
}

contract ZKCodeReview is ZKCodeReviewToken {
    struct Circuit {
        string name;
        string version;
        address verifier;
        bool active;
        address creator;
        uint256 weight;  // Importance weight for verification
    }

    struct Issue {
        uint256 issueId;
        address creator;
        string description;
        address[] verifierContracts;
        bool resolved;
        uint256 approvalCount;
        uint256 requiredApprovals;
        uint256 bounty;
        uint256 stakingRequirement;
        Circuit[] requiredCircuits;
        uint256 deadline;
    }

    struct Solution {
        address contributor;
        bool[] proofVerifications;
        uint256 reviewersApproved;
        bool accepted;
        uint256 stakedAmount;
        uint256 submissionTime;
    }

    struct Reviewer {
        uint256 reputation;
        uint256 successfulReviews;
        mapping(bytes32 => uint256) expertiseAreas;  // expertise area hash => level
        uint256 stakingBalance;
    }

    mapping(uint256 => Issue) public issues;
    mapping(uint256 => Solution) public solutions;
    mapping(uint256 => mapping(address => bool)) public hasReviewed;
    mapping(address => Reviewer) public reviewers;
    mapping(bytes32 => Circuit) public circuits;
    
    uint256 public issueCount;
    uint256 public minReviewers = 2;
    uint256 public constant REPUTATION_REWARD = 100;
    uint256 public constant SUCCESSFUL_SOLUTION_REWARD = 500;
    
    event IssueCreated(uint256 indexed issueId, address creator, string description);
    event VerifierAdded(uint256 indexed issueId, address verifierContract);
    event SolutionSubmitted(uint256 indexed issueId, address contributor);
    event SolutionApproved(uint256 indexed issueId, address reviewer);
    event IssueResolved(uint256 indexed issueId, address contributor);
    event CircuitAdded(bytes32 indexed circuitId, string name, string version);
    event BountyAdded(uint256 indexed issueId, uint256 amount);
    event ReputationEarned(address indexed user, uint256 amount);

    // Modifiers
    modifier onlyWithReputation(uint256 minReputation) {
        require(reviewers[msg.sender].reputation >= minReputation, "Insufficient reputation");
        _;
    }

    modifier onlyBeforeDeadline(uint256 issueId) {
        require(block.timestamp < issues[issueId].deadline, "Deadline passed");
        _;
    }

    modifier onlyStaked(uint256 issueId) {
        require(solutions[issueId].stakedAmount >= issues[issueId].stakingRequirement, "Must stake");
        _;
    }

    // Constructor
    constructor() {
        // Initialize with default circuits
        addCircuit("array-sum", "1.0.0", address(0), 1);
        addCircuit("memory-safety", "1.0.0", address(0), 2);
        addCircuit("null-check", "1.0.0", address(0), 1);
    }

    function addCircuit(
        string memory name,
        string memory version,
        address verifier,
        uint256 weight
    ) public onlyWithReputation(1000) {
        bytes32 circuitId = keccak256(abi.encodePacked(name, version));
        circuits[circuitId] = Circuit({
            name: name,
            version: version,
            verifier: verifier,
            active: true,
            creator: msg.sender,
            weight: weight
        });
        
        emit CircuitAdded(circuitId, name, version);
    }

    function createIssue(
        string memory description,
        address[] memory verifiers,
        uint256 deadline,
        uint256 stakingRequirement
    ) external payable {
        require(verifiers.length > 0, "Must provide at least one verifier");
        require(deadline > block.timestamp, "Invalid deadline");
        
        issueCount++;
        issues[issueCount] = Issue({
            issueId: issueCount,
            creator: msg.sender,
            description: description,
            verifierContracts: verifiers,
            resolved: false,
            approvalCount: 0,
            requiredApprovals: minReviewers,
            bounty: msg.value,
            stakingRequirement: stakingRequirement,
            requiredCircuits: new Circuit[](0),
            deadline: deadline
        });

        emit IssueCreated(issueCount, msg.sender, description);
        if(msg.value > 0) {
            emit BountyAdded(issueCount, msg.value);
        }
    }

    function submitSolution(
        uint256 issueId,
        uint256[2][] memory a,
        uint256[2][2][] memory b,
        uint256[2][] memory c,
        uint256[1][] memory inputs
    ) external payable onlyBeforeDeadline(issueId) {
        require(!issues[issueId].resolved, "Issue already resolved");
        require(msg.value >= issues[issueId].stakingRequirement, "Insufficient stake");
        
        bool[] memory verifications = new bool[](a.length);
        uint256 totalWeight = 0;
        
        // Verify all proofs against their respective verifier contracts
        for (uint256 i = 0; i < a.length; i++) {
            IVerifier verifier = IVerifier(issues[issueId].verifierContracts[i]);
            verifications[i] = verifier.verifyProof(a[i], b[i], c[i], inputs[i]);
            require(verifications[i], "Proof verification failed");
            
            // Add weight from circuit
            bytes32 circuitId = keccak256(abi.encodePacked(
                issues[issueId].requiredCircuits[i].name,
                issues[issueId].requiredCircuits[i].version
            ));
            totalWeight += circuits[circuitId].weight;
        }

        solutions[issueId] = Solution({
            contributor: msg.sender,
            proofVerifications: verifications,
            reviewersApproved: 0,
            accepted: false,
            stakedAmount: msg.value,
            submissionTime: block.timestamp
        });

        emit SolutionSubmitted(issueId, msg.sender);
    }

    function reviewSolution(
        uint256 issueId,
        bool approved,
        string memory expertiseArea
    ) external onlyWithReputation(500) {
        require(!issues[issueId].resolved, "Issue already resolved");
        require(!hasReviewed[issueId][msg.sender], "Already reviewed");
        
        hasReviewed[issueId][msg.sender] = true;
        
        // Weight the review based on reputation and expertise
        uint256 reviewWeight = calculateReviewWeight(msg.sender, expertiseArea);
        
        if (approved) {
            solutions[issueId].reviewersApproved += reviewWeight;
            
            if (solutions[issueId].reviewersApproved >= issues[issueId].requiredApprovals) {
                resolveSolution(issueId);
            }
        }

        // Update reviewer reputation
        reviewers[msg.sender].successfulReviews++;
        addReputation(msg.sender, REPUTATION_REWARD);
        
        emit SolutionApproved(issueId, msg.sender);
        emit ReputationEarned(msg.sender, REPUTATION_REWARD);
    }

    function resolveSolution(uint256 issueId) internal {
        Solution storage solution = solutions[issueId];
        Issue storage issue = issues[issueId];
        
        solution.accepted = true;
        issue.resolved = true;
        
        // Return stake and award bounty
        payable(solution.contributor).transfer(solution.stakedAmount + issue.bounty);
        
        // Award reputation and tokens
        addReputation(solution.contributor, SUCCESSFUL_SOLUTION_REWARD);
        mint(solution.contributor, SUCCESSFUL_SOLUTION_REWARD);
        
        emit IssueResolved(issueId, solution.contributor);
        emit ReputationEarned(solution.contributor, SUCCESSFUL_SOLUTION_REWARD);
    }

    function calculateReviewWeight(
        address reviewer,
        string memory expertiseArea
    ) internal view returns (uint256) {
        bytes32 areaHash = keccak256(abi.encodePacked(expertiseArea));
        uint256 expertise = reviewers[msg.sender].expertiseAreas[areaHash];
        uint256 baseWeight = reviewers[msg.sender].reputation / 1000;
        
        return baseWeight * (1 + expertise);
    }

    function addExpertise(
        address reviewer,
        string memory area,
        uint256 level
    ) external onlyWithReputation(2000) {
        bytes32 areaHash = keccak256(abi.encodePacked(area));
        reviewers[reviewer].expertiseAreas[areaHash] = level;
    }

    receive() external payable {
        // Accept ETH for bounties
    }
}