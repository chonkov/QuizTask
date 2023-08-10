const { ethers } = require("hardhat");

async function main() {
  // Quiz deployment
  const Quiz = await ethers.getContractFactory("Quiz");
  const quiz = await Quiz.deploy();
  await quiz.waitForDeployment();
  console.log(`Quiz deployed to ${quiz.target}`);

  // Factory deployment
  const factory = await ethers.deployContract("Factory");
  await factory.waitForDeployment();
  console.log(`Factory deployed to ${factory.target}`);

  // Proxy deployment
  const txResponse = await factory.deploy(await quiz.getAddress());
  const txReceipt = await txResponse.wait();
  console.log(txReceipt.logs[0].args[0]);
  const proxyAddr = txReceipt.logs[0].args[0];
  const proxy = Quiz.attach(proxyAddr);

  // Proxy interaction
  const answer = await proxy.getHash("answer");
  const tx = await proxy.initialize(answer);
  await tx.wait();

  // Logging the answers - original quiz does not have, proxy has
  console.log(await proxy.answer());
  console.log(await quiz.answer());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
