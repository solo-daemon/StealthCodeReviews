import { Probot } from 'probot';
import { ethers } from 'ethers';
import express from 'express';
import bodyParser from 'body-parser';
import { create as ipfsHttpClient } from 'ipfs-http-client';

// Import ABIs (assuming they are available)
import ZK_REVIEW_ABI from './abis/ZKReviewABI.json';
import DAO_ABI from './abis/DAOABI.json';
import GITHUB_BOT_ABI from './abis/GitHubBotABI.json';

const provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL!);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const zkReviewContract = new ethers.Contract(process.env.ZK_REVIEW_CONTRACT_ADDRESS!, ZK_REVIEW_ABI, signer);
const daoContract = new ethers.Contract(process.env.DAO_CONTRACT_ADDRESS!, DAO_ABI, signer);
const githubBotContract = new ethers.Contract(process.env.GITHUB_BOT_CONTRACT_ADDRESS!, GITHUB_BOT_ABI, signer);
const ipfs = ipfsHttpClient({ url: process.env.IPFS_URL });

const REPO_OWNER = 'solo-daemon';
const REPO_NAME = 'example-syntax-error';

export default function(app: Probot) {
  const expressApp = express();
  expressApp.use(bodyParser.json());

  expressApp.post('/github', async (req, res) => {
    const githubEvent = req.headers['x-github-event'] as string;
    const { body } = req;

    console.log(`Received GitHub event: ${githubEvent}`);

    try {
      switch (githubEvent) {
        case 'issues':
          if (body.action === 'opened') {
            await handleIssueOpened(app, body);
          }
          break;
        case 'issue_comment':
          if (body.action === 'created') {
            await handleIssueComment(app, body);
          }
          break;
        case 'pull_request':
          if (body.action === 'closed' && body.pull_request.merged) {
            await handlePullRequestMerged(app, body);
          }
          break;
        default:
          console.log(`Unhandled GitHub event: ${githubEvent}`);
      }
      res.sendStatus(200);
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  expressApp.listen(8080, () => console.log('GitHub webhook server is running on port 8080'));

  app.on('issues.opened', async (context) => {
    await handleIssueOpened(app, context);
  });

  app.on('issue_comment.created', async (context) => {
    await handleIssueComment(app, context);
  });

  app.on('pull_request.closed', async (context) => {
    if (context.payload.pull_request.merged) {
      await handlePullRequestMerged(app, context);
    }
  });
}

async function handleIssueOpened(app: Probot, context: any) {
  const issueNumber = context.payload.issue.number;

  await context.octokit.issues.createComment({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    issue_number: issueNumber,
    body: 'Please provide the IPFS CID of the zk-circuits you have uploaded to the chain using the command:\n\n`/zkbot add-circuits [IPFS_CID]`'
  });
}

async function handleIssueComment(app: Probot, context: any) {
  const commentBody = context.payload.comment.body;
  const issueNumber = context.payload.issue.number;

  if (commentBody.startsWith('/zkbot')) {
    const parts = commentBody.split(' ');
    const command = parts[1];

    switch (command) {
      case 'add-circuits':
        await handleAddCircuits(app, context, parts[2]);
        break;
      case 'hereisprove':
        await handleHereIsProve(app, context, parts[2]);
        break;
      default:
        await context.octokit.issues.createComment({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          issue_number: issueNumber,
          body: 'Unknown command. Available commands are:\n- `/zkbot add-circuits [IPFS_CID]`\n- `/zkbot hereisprove [IPFS_CID]`'
        });
    }
  }
}

async function handleAddCircuits(app: Probot, context: any, ipfsCID: string) {
  const issueNumber = context.payload.issue.number;
  const issueCreator = context.payload.issue.user.login;
  const commenter = context.payload.comment.user.login;

  if (commenter !== issueCreator) {
    await context.octokit.issues.createComment({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      issue_number: issueNumber,
      body: 'Only the issue creator can add circuits.'
    });
    return;
  }

  try {
    const tx = await zkReviewContract.registerCircuit(
      `Circuit for Issue #${issueNumber}`,
      `Circuit for GitHub issue #${issueNumber}`,
      ipfsCID,
      githubBotContract.address
    );
    await tx.wait();

    await context.octokit.issues.createComment({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      issue_number: issueNumber,
      body: `Circuits with IPFS CID ${ipfsCID} have been registered on-chain.`
    });
  } catch (error) {
    await context.octokit.issues.createComment({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      issue_number: issueNumber,
      body: `Error registering circuits: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

async function handleHereIsProve(app: Probot, context: any, ipfsCID: string) {
  const issueNumber = context.payload.issue.number;

  try {
    const proofData = await (await ipfs.cat(ipfsCID)).toString();
    const { a, b, c, input } = JSON.parse(proofData);

    const tx = await zkReviewContract.submitSolution(
      issueNumber,
      ipfsCID,
      a,
      b,
      c,
      input
    );
    await tx.wait();

    await context.octokit.issues.createComment({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      issue_number: issueNumber,
      body: `Solution with IPFS CID ${ipfsCID} has been submitted and verified on-chain.`
    });

    // Create a pull request with the solution
    const branchName = `solution-${issueNumber}`;
    await createBranch(context, branchName);
    await createOrUpdateFile(context, `solutions/issue-${issueNumber}-solution.json`, proofData, branchName);

    const pr = await context.octokit.pulls.create({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      title: `Solution for Issue #${issueNumber}`,
      head: branchName,
      base: 'main',
      body: `This PR contains the verified solution for Issue #${issueNumber}\n\nIPFS CID: ${ipfsCID}`
    });

    console.log(`Created PR #${pr.data.number} for Issue #${issueNumber}`);
  } catch (error) {
    await context.octokit.issues.createComment({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      issue_number: issueNumber,
      body: `Error submitting solution: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

async function handlePullRequestMerged(app: Probot, context: any) {
  const prBody = context.payload.pull_request.body;
  const issueIdMatch = prBody.match(/Issue #(\d+)/);
  
  if (issueIdMatch) {
    const issueId = parseInt(issueIdMatch[1]);
    try {
      const tx = await githubBotContract.triggerBountyRelease(issueId);
      await tx.wait();

      await context.octokit.issues.createComment({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        issue_number: issueId,
        body: `Full bounty release has been triggered for Issue #${issueId}`
      });
    } catch (error) {
      await context.octokit.issues.createComment({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        issue_number: issueId,
        body: `Error triggering full bounty release: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
}

async function createBranch(context: any, branchName: string): Promise<void> {
  const { data: ref } = await context.octokit.git.getRef({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref: 'heads/main'
  });

  await context.octokit.git.createRef({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref: `refs/heads/${branchName}`,
    sha: ref.object.sha
  });
}

async function createOrUpdateFile(context: any, path: string, content: string, branch: string): Promise<void> {
  const { data: file } = await context.octokit.repos.getContent({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path,
    ref: branch
  }).catch(() => ({ data: null }));

  await context.octokit.repos.createOrUpdateFileContents({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path,
    message: `Add solution for issue #${path.split('-')[1].split('.')[0]}`,
    content: Buffer.from(content).toString('base64'),
    branch,
    sha: file ? file.sha : undefined
  });
}