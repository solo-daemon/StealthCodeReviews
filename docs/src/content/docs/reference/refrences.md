---
title: References
description: A collection of resources and references used in the Stealth Code Reviews project.
---

## References

<div class="reference-grid">
  <div class="reference-card">
    <h3>Astro Documentation</h3>
    <p>
      Explore the official Astro documentation for detailed guides and examples on building static sites.
    </p>
    <a href="https://astro.build/docs" target="_blank" rel="noopener noreferrer">Read more</a>
  </div>
  <div class="reference-card">
    <h3>VS Code Extensions</h3>
    <p>
      Enhance your development experience with essential VS Code extensions for improved productivity.
    </p>
    <a href="https://code.visualstudio.com/api/get-started/your-first-extension" target="_blank" rel="noopener noreferrer">Explore Extensions</a>
  </div>
  <div class="reference-card">
    <h3>Probot Documentation</h3>
    <p>
      Learn how to build GitHub Apps with Probot and automate your workflow effectively.
    </p>
    <a href="https://probot.github.io/docs/" target="_blank" rel="noopener noreferrer">View Probot Docs</a>
  </div>
  <div class="reference-card">
    <h3>IPFS Documentation</h3>
    <p>
      Understand the concepts behind IPFS and how to use it for decentralized storage.
    </p>
    <a href="https://docs.ipfs.io/" target="_blank" rel="noopener noreferrer">IPFS Docs</a>
  </div>
  
  <div class="reference-card">
    <h3>zk-SNARKs Overview</h3>
    <p>
      Gain insights into zero-knowledge proofs and their applications in privacy-preserving technologies.
    </p>
    <a href="https://z.cash/technology/zksnarks/" target="_blank" rel="noopener noreferrer">Learn about zk-SNARKs</a>
  </div>
  <div class="reference-card">
    <h3>Solidity Documentation</h3>
    <p>
      Discover the official Solidity documentation to learn about smart contract development on Ethereum.
    </p>
    <a href="https://docs.soliditylang.org/en/v0.8.20/" target="_blank" rel="noopener noreferrer">Explore Solidity Docs</a>
  </div>
  <div class="reference-card">
    <h3>GitHub API Documentation</h3>
    <p>
      Access the GitHub API documentation to understand how to interact with GitHub services programmatically.
    </p>
    <a href="https://docs.github.com/en/rest" target="_blank" rel="noopener noreferrer">View GitHub API Docs</a>
  </div>
</div>

<style>
  .reference-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 16px; /* Spacing between reference cards */
  }

  .reference-card {
    flex: 1 1 calc(33.333% - 16px); /* Adjust this for 3 cards per row */
    padding: 16px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .reference-card h3 {
    margin-top: 0;
  }

  .reference-card a {
    display: inline-block;
    margin-top: 8px;
    color: #0070f3;
    text-decoration: none;
  }

  .reference-card a:hover {
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    .reference-card {
      flex: 1 1 100%; /* Full width on smaller screens */
    }
  }
</style>
