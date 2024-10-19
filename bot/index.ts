import { Probot } from 'probot';
import { ethers } from 'ethers';
import { create } from 'ipfs-http-client';
import fs from 'fs/promises';
import path from 'path';


const ZK_REVIEW_ABI:any=[]
const DAO_ABI:any=[]
const wallet = ethers.Wallet.createRandom();

const provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL!);
const signer = new ethers.Wallet(wallet.privateKey, provider);
const zkReviewContract = new ethers.Contract(process.env.ZK_REVIEW_CONTRACT_ADDRESS!, ZK_REVIEW_ABI, signer);
const daoContract = new ethers.Contract(process.env.DAO_CONTRACT_ADDRESS!, DAO_ABI, signer);
const ipfs = create({ url: process.env.IPFS_URL });
const contextMap: Record<string, any> = {};
export default function(app: Probot) {
  app.on('issues.opened', async (context) => {
    const issueId = context.payload.issue.id.toString();
    contextMap[issueId] = context; 
    const issueBody = context.payload.issue.body as string;
    const issueCreator = context.payload.issue.user.login;

    const circuitId = parseCircuitId(issueBody);
    const bountyAmount = parseBountyAmount(issueBody);
    const metamaskId = parseMetamaskId(issueBody);

    if (!circuitId || !bountyAmount || !metamaskId) {
      await context.octokit.issues.createComment(context.issue({
        body: 'Please provide circuitId, bountyAmount, and metamaskId in the issue description.'
      }));
      return;
    }

    try {
      const tx = await zkReviewContract.createIssue(
        context.payload.issue.title,
        context.payload.issue.body,
        circuitId,
        { value: ethers.parseEther(bountyAmount) }
      );
     // Log transaction response
  console.log("Transaction response:", tx);

  const receipt = await tx.wait();
  console.log("Transaction receipt:", receipt);

      const issueId = await zkReviewContract.issueCount();

      const circuits = await fetchCircuits();
      const circuitList = formatCircuitList(circuits);

      await context.octokit.issues.update(context.issue({
        body: `${issueBody}\n\n---\nOn-chain Issue ID: ${issueId}\nMetamask ID: ${metamaskId}\n\nAvailable Circuits:\n${circuitList}`
      }));

      await context.octokit.issues.createComment(context.issue({
        body: `Issue registered on-chain with ID: ${issueId}`
      }));
    } catch (error: any) {
      await context.octokit.issues.createComment(context.issue({
        body: `Error registering issue on-chain: ${error.message}`
      }));
    }
  });

  app.on('pull_request.closed', async (context) => {
    if (context.payload.pull_request.merged) {
      const prBody = context.payload.pull_request.body as string;
      const issueId = parseIssueId(prBody);
      const contributorMetamaskId = parseContributorMetamaskId(prBody);

      if (issueId && contributorMetamaskId) {
        try {
          const tx = await daoContract.releaseFullBounty(issueId);
          await tx.wait();

          await context.octokit.issues.createComment(context.issue({
            body: `Full bounty released to contributor (${contributorMetamaskId}) for Issue #${issueId}`
          }));
        } catch (error:any) {
          await context.octokit.issues.createComment(context.issue({
            body: `Error releasing full bounty: ${error.message}`
          }));
        }
      }
    }
  });

  zkReviewContract.on('SolutionVerified', async (issueId, contributor, solutionCID, event) => {
    const context = contextMap[issueId.toString()];
    try {
      const issue = await zkReviewContract.issues(issueId);
      const solutionData = JSON.parse((await ipfs.cat(solutionCID)).toString());

      const branchName = `solution-${issueId}-${contributor.slice(0, 8)}`;
      await createBranch(context, branchName);
      await createOrUpdateFile(context, `solutions/issue-${issueId}-solution.js`, solutionData.code, branchName);

      const pr = await context.octokit.pulls.create({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        title: `Solution for Issue #${issueId}`,
        head: branchName,
        base: 'main',
        body: `This PR contains the solution for Issue #${issueId}\n\nContributor: ${contributor}\nMetamask ID: ${contributor}`
      });

      console.log(`Created PR #${pr.data.number} for Issue #${issueId}`);
    } catch (error) {
      console.error('Error creating PR:', error);
    }
  });
}

async function fetchCircuits(): Promise<any[]> {
  const circuitCount = await zkReviewContract.circuitCount();
  const circuits = [];

  for (let i = 0; i < circuitCount; i++) {
    const circuitId = await zkReviewContract.circuitIds(i);
    const circuit = await zkReviewContract.circuits(circuitId);
    circuits.push({ id: circuitId, ...circuit });
  }

  return circuits;
}

function formatCircuitList(circuits: any[]): string {
  return circuits.map(circuit => 
    `- ${circuit.name} (ID: ${circuit.id})\n  Description: ${circuit.description}\n  IPFS CID: ${circuit.ipfsCID}`
  ).join('\n\n');
}

function parseCircuitId(body: string): string | null {
  const match = body.match(/Circuit ID:\s*(\S+)/);
  return match ? match[1] : null;
}

function parseBountyAmount(body: string): string | null {
  const match = body.match(/Bounty Amount:\s*(\d+(\.\d+)?)/);
  return match ? match[1] : null;
}

function parseMetamaskId(body: string): string | null {
  const match = body.match(/Metamask ID:\s*(0x[a-fA-F0-9]{40})/);
  return match ? match[1] : null;
}

function parseIssueId(body: string): number | null {
  const match = body.match(/Issue #(\d+)/);
  return match ? parseInt(match[1]) : null;
}

function parseContributorMetamaskId(body: string): string | null {
  const match = body.match(/Contributor:\s*(0x[a-fA-F0-9]{40})/);
  return match ? match[1] : null;
}

async function createBranch(context: any, branchName: string): Promise<void> {
  const { data: ref } = await context.octokit.git.getRef(context.repo({
    ref: 'heads/main'
  }));

  await context.octokit.git.createRef(context.repo({
    ref: `refs/heads/${branchName}`,
    sha: ref.object.sha
  }));
}

async function createOrUpdateFile(context: any, path: string, content: string, branch: string): Promise<void> {
  const { data: file } = await context.octokit.repos.getContent(context.repo({
    path,
    ref: branch
  })).catch(() => ({ data: null }));

  await context.octokit.repos.createOrUpdateFileContents(context.repo({
    path,
    message: `Add solution for issue #${parseIssueId(content)}`,
    content: Buffer.from(content).toString('base64'),
    branch,
    sha: file ? file.sha : undefined
  }));
}