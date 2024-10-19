---
title: Circuits
description: Detailed overview of the circuits used in the Stealth Code Reviews project.
---

## Circuits Overview

In the **Stealth Code Reviews** project, circuits play a crucial role in enabling secure and privacy-preserving verification of code reviews. Leveraging zero-knowledge proofs, these circuits ensure that contributors can prove the validity of their solutions without revealing sensitive information.

---

## What is a Circuit?

A circuit is a cryptographic construct that allows one party to prove to another that a statement is true without revealing any additional information beyond the validity of the statement. In our project, circuits are used to verify the correctness of solutions submitted for code reviews.

### Key Characteristics

- **Privacy**: Circuits ensure that sensitive data remains confidential while allowing for validation.
- **Efficiency**: They enable quick verification processes, reducing the time required for code reviews.
- **Decentralization**: By utilizing blockchain technology, circuits help maintain the integrity and transparency of the review process.

---

## Circuit Registration

The registration of circuits is facilitated through the **ZKCodeReview** contract. Verifiers can register new circuits, which include important metadata that aids in the review process.

### Registration Process

1. **Circuit Details**: Each circuit is registered with a unique identifier, a name, a description, and an IPFS CID for associated data storage.
2. **Verifier Association**: Each circuit must be associated with a verifier, who is responsible for validating the proofs generated during the review process.
3. **Activation**: Registered circuits can be activated or deactivated based on their availability for use in the review process.

### Example Circuit Metadata

- **Name**: Simple Addition Circuit
- **Description**: A circuit that verifies the sum of two numbers.
- **IPFS CID**: `Qm...` (Link to additional circuit data)
- **Verifier**: `0x...` (Address of the verifier)

---

## Circuit Utilization

Circuits are utilized in the following processes within the Stealth Code Reviews project:

- **Solution Verification**: When a contributor submits a solution, the corresponding circuit is used to verify the proof of correctness without revealing the solution itself.
- **Issue Creation**: Only active circuits can be associated with new issues, ensuring that all submissions adhere to the defined verification protocols.

---