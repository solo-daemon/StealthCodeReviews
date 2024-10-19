---
title: Smart Contracts
description: Overview of the smart contracts used in the Stealth Code Reviews project.
---

## Smart Contracts Overview

The Stealth Code Reviews project utilizes smart contracts on the Ethereum blockchain to facilitate secure and transparent code reviews. These contracts enable functionalities such as bounty management, proof verification, and issue tracking, ensuring that the review process is efficient and trustworthy.

## ZKCodeReview Contract

The `ZKCodeReview` contract manages the creation and storage of code review submissions while ensuring that the verification process uses zero-knowledge proofs.

### Key Features

- **Circuit Registration**: Allows verifiers to register circuits used for zero-knowledge proofs.
- **Issue Management**: Users can create issues related to code snippets, which can be reviewed and rewarded.
- **Solution Submission**: Contributors can submit solutions along with a verification proof.

### Functionality

- **registerCircuit**: Registers a new circuit with its details, including the name, description, IPFS CID, and verifier's address.
- **createIssue**: Allows users to create new issues with a description, code snippet, and associated circuit ID, while also setting a bounty.
- **submitSolution**: Lets contributors submit their solutions and accompanying proof for verification. If verified, the issue is marked as resolved.

---
