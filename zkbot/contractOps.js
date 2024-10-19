import { ethers } from 'ethers'

import githubBotABI from './abis/GITHUB_BOT_ABI.json' assert { type: 'json' };
import zkCodeReviewABI from './abis/ZK_REVIEW_ABI.json' assert { type: 'json' };
import daoABI from './abis/DAO_ABI.json' assert { type: 'json' };

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545/");
const signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider)

const zkReviewContract = new ethers.Contract(
    process.env.ZK_REVIEW_CONTRACT_ADDRESS,
    zkCodeReviewABI,
    signer,
  );
const daoContract = new ethers.Contract(process.env.DAO_CONTRACT_ADDRESS, daoABI, provider);
const githubBotContract = new ethers.Contract(process.env.GITHUB_BOT_CONTRACT_ADDRESS, githubBotABI, provider);

export { zkReviewContract, daoContract, githubBotContract }

