// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVerifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[1] memory input
    ) external view returns (bool);
}

interface IDAO {
    function initiateBounty(uint256 issueId, uint256 amount) external;
    function releaseBounty(uint256 issueId, address contributor) external;
}

contract ZKCodeReview {
    struct Circuit {
        string name;
        string description;
        string ipfsCID;
        address verifier;
        bool active;
    }

    struct Issue {
        uint256 id;
        address creator;
        string description;
        string codeSnippet;
        bytes32 circuitId;
        uint256 bounty;
        bool resolved;
    }

    struct Solution {
        address contributor;
        string solutionCID;
        bool verified;
    }

    mapping(bytes32 => Circuit) public circuits;
    mapping(uint256 => Issue) public issues;
    mapping(uint256 => Solution) public solutions;
    mapping(uint256 => bytes32) public circuitIds;
    uint256 public circuitCount;

    uint256 public issueCount;
    IDAO public dao;

    event CircuitRegistered(bytes32 indexed circuitId, string name, string ipfsCID);
    event IssueCreated(uint256 indexed issueId, address creator, uint256 bounty);
    event SolutionSubmitted(uint256 indexed issueId, address contributor, string solutionCID);
    event SolutionVerified(uint256 indexed issueId, address contributor, string solutionCID);

    constructor(address _dao) {
        dao = IDAO(_dao);
    }

    function registerCircuit(
        string memory name,
        string memory description,
        string memory ipfsCID,
        address verifier
    ) external {
        bytes32 circuitId = keccak256(abi.encodePacked(name, ipfsCID));
        require(circuits[circuitId].verifier == address(0), "Circuit already exists");

        circuits[circuitId] = Circuit({
            name: name,
            description: description,
            ipfsCID: ipfsCID,
            verifier: verifier,
            active: true
        });
        circuitCount++;
        circuitIds[circuitCount] = circuitId;
        emit CircuitRegistered(circuitId, name, ipfsCID);
    }

    function createIssue(
        string memory description,
        string memory codeSnippet,
        bytes32 circuitId
    ) external payable {
        require(circuits[circuitId].verifier != address(0), "Invalid circuit");
        require(circuits[circuitId].active, "Circuit is not active");
        
        issueCount++;
        issues[issueCount] = Issue({
            id: issueCount,
            creator: msg.sender,
            description: description,
            codeSnippet: codeSnippet,
            circuitId: circuitId,
            bounty: msg.value,
            resolved: false
        });
        
        dao.initiateBounty(issueCount, msg.value);
        emit IssueCreated(issueCount, msg.sender, msg.value);
    }

    function submitSolution(
        uint256 issueId,
        string memory solutionCID,
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[1] memory input
    ) external {
        require(!issues[issueId].resolved, "Issue already resolved");
        
        Issue storage issue = issues[issueId];
        IVerifier verifier = IVerifier(circuits[issue.circuitId].verifier);
        
        require(verifier.verifyProof(a, b, c, input), "Invalid proof");
        
        solutions[issueId] = Solution({
            contributor: msg.sender,
            solutionCID: solutionCID,
            verified: true
        });
        issue.resolved = true;
        
        dao.releaseBounty(issueId, msg.sender);
        
        emit SolutionSubmitted(issueId, msg.sender, solutionCID);
        emit SolutionVerified(issueId, msg.sender, solutionCID);
    }

    function getCircuitCount() external view returns (uint256) {
        return circuitCount;
    }

    function getCircuitDetails(bytes32 circuitId) external view returns (
        string memory name,
        string memory description,
        string memory ipfsCID,
        address verifier,
        bool active
    ) {
        Circuit storage circuit = circuits[circuitId];
        return (circuit.name, circuit.description, circuit.ipfsCID, circuit.verifier, circuit.active);
    }

    function deactivateCircuit(bytes32 circuitId) external {
        require(msg.sender == circuits[circuitId].verifier, "Only verifier can deactivate");
        circuits[circuitId].active = false;
    }
}