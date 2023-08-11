const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Factory", function () {
  async function deployQuiz() {
    const QUESTION = "Can you guess the secret string?";

    const quiz = await ethers.deployContract("Quiz");
    await quiz.waitForDeployment();

    const answer = await quiz.getHash("answer");
    const finalAnswer = await quiz.getHashWithSalt(answer);

    return { quiz, QUESTION, answer, finalAnswer };
  }

  async function deployFactory() {
    const factory = await ethers.deployContract("Factory");
    await factory.waitForDeployment();

    return { factory };
  }

  describe("Deployment", function () {
    it("Should have an empty array of addresses", async function () {
      const { factory } = await loadFixture(deployFactory);
      expect((await factory.getProxies()).length).to.equal(0);
    });
  });

  describe("Deploying proxies", function () {
    it("Should not revert if a valid address is passed as an arg", async function () {
      const { quiz } = await loadFixture(deployQuiz);
      const { factory } = await loadFixture(deployFactory);

      await expect(factory.deploy(quiz.target)).to.not.be.reverted;
    });

    it("Should emit an event", async function () {
      const { quiz } = await loadFixture(deployQuiz);
      const { factory } = await loadFixture(deployFactory);

      await expect(factory.deploy(quiz.target)).to.emit(factory, "Deployment");
    });

    it("Should push the new proxy to the array", async function () {
      const { quiz } = await loadFixture(deployQuiz);
      const { factory } = await loadFixture(deployFactory);

      const txResponse = await factory.deploy(await quiz.getAddress());
      const txReceipt = await txResponse.wait();
      const proxyAddr = txReceipt.logs[0].args[0];

      expect((await factory.getProxies()).length).to.equal(1);
      expect(await factory.getProxy(0)).to.equal(proxyAddr);
    });
  });
});
