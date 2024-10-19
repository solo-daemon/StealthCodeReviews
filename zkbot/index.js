/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */

import { zkReviewContract, daoContract, githubBotContract } from './contractOps.js';

export default (app) => {
  // Your code here
  app.log.info("Yay, the app was loaded!");

  app.on('issues.opened', async (context) => {
    const issueComment = context.issue({
      body: 'Please create a zk-circuit and provide the IPFS CID and verifier contract address using the command: `/zkbot add-circuit [IPFS_CID] [Verifier Contract Address]`',
    });
    await context.octokit.issues.createComment(issueComment);
  });
  
  app.on('issue_comment.created', async (context) => {
    const commentBody = context.payload.comment.body;
    if (commentBody.startsWith('/zkbot add-circuit')) {
      const [, , ipfsCid, verifierContractAddress] = commentBody.split(' ');
      await addCircuitToContract(ipfsCid, verifierContractAddress, context);
      await context.octokit.issues.createComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue.number,
        body: `Circuit with IPFS CID ${ipfsCid} has been registered on-chain.`,
      });
    }
  });
  app.on('issue_comment.created', async (context) => {
    const commentBody = context.payload.comment.body;
    if (commentBody.startsWith('/zkbot hereisprove')) {
      const [, , solutionCid] = commentBody.split(' ');
      await handleHereIsProve(context, solutionCid);
    }
  });

};

async function addCircuitToContract(ipfsCid, verifierContractAddress, context) {
  try {
    const tx = await zkReviewContract.registerCircuit(
      `Circuit for Issue #${context.payload.issue.number}`,
      `Circuit for GitHub issue #${context.payload.issue.number}`,
      ipfsCid,
      verifierContractAddress,
    );
    await tx.wait();
    await context.octokit.issues.createComment({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue.number,
      body: `Circuit with IPFS CID ${ipfsCid} has been registered on-chain.`,
    });
  } catch (error) {
    // await context.octokit.issues.createComment({
    //   owner: context.payload.repository.owner.login,
    //   repo: context.payload.repository.name,
    //   issue_number: context.payload.issue.number,
    //   body: `Error registering circuit: ${error.message}`,
    // });
  }
}


async function handleHereIsProve(context, solutionCid) {
  try {
    const proofData = await (await ipfs.cat(solutionCid)).toString();
    const { a, b, c, input } = JSON.parse(proofData);

    const tx = await zkReviewContract.submitSolution(
      context.payload.issue.number,
      solutionCid,
      a,
      b,
      c,
      input,
    );
    await tx.wait();

    const shaHash = await zkReviewContract.getSHAHash(context.payload.issue.number);
    await context.octokit.issues.createComment({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue.number,
      body: `Solution with IPFS CID ${solutionCid} has been verified on-chain. SHA Hash: ${shaHash}`,
    });

    // Create a pull request on behalf of the contributor
    const contributor = context.payload.comment.user.login;
    const prTitle = `Solution for Issue #${context.payload.issue.number}`;
    const prBody = `This pull request contains the verified solution for Issue #${context.payload.issue.number}.`;
    const prHead = `solution-${context.payload.issue.number}`;
    const prBase = 'main';

    await context.octokit.pulls.create({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      title: prTitle,
      head: prHead,
      base: prBase,
      body: prBody,
      maintainer_can_modify: true,
    });

    // Tag the contributor in the pull request
    await context.octokit.issues.createComment({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue.number,
      body: `@${contributor} has submitted a verified solution for this issue.`,
    });

    const daoContract = new ethers.Contract(
      process.env.DAO_CONTRACT_ADDRESS,
      daoABI,
      signer,
    );
    const bountyAmount = await daoContract.getBountyAmount(context.payload.issue.number);
    const partialBountyAmount = bountyAmount / 2; // Allocate 50% of the bounty
    await daoContract.releaseBounty(context.payload.issue.number, contributor, partialBountyAmount);

    await context.octokit.issues.createComment({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue.number,
      body: `A partial bounty of ${partialBountyAmount} has been allocated to @${contributor} for their verified solution.`,
    });
  } catch (error) {
    await context.octokit.issues.createComment({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue.number,
      body: `Error allocating bounty: ${error.message}`,
    });
  }
}

async function handlePullRequestMerged(context) {
  try {
    const prNumber = context.payload.pull_request.number;
    const issueNumber = context.payload.pull_request.issue_number;
    const contributor = context.payload.pull_request.user.login;

    // Allocate the full bounty to the contributor
    const daoContract = new ethers.Contract(
      process.env.DAO_CONTRACT_ADDRESS,
      daoABI,
      signer,
    );
    const bountyAmount = await daoContract.getBountyAmount(context.payload.issue.number);
    await daoContract.releaseBounty(context.payload.issue.number, contributor, bountyAmount);

    await context.octokit.issues.createComment({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue.number,
      body: `The full bounty of ${bountyAmount} has been allocated to @${contributor} for their verified solution.`,
    });
  } catch (error) {
    await context.octokit.issues.createComment({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue.number,
      body: `Error allocating bounty: ${error.message}`,
    });
  }
}