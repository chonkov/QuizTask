const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Proxy", function () {
  async function deployQuiz() {
    const QUESTION = "Can you guess the secret string?";
    const SALT = "Random salt prepended to the msg";

    const quiz = await ethers.deployContract("Quiz");
    await quiz.waitForDeployment();

    const answer = await quiz.getHash("answer");
    const finalAnswer = await quiz.getHashWithSalt(answer);

    return { quiz, QUESTION, SALT, answer, finalAnswer };
  }

  async function deployFactory() {
    const factory = await ethers.deployContract("Factory");
    await factory.waitForDeployment();

    return { factory };
  }

  async function deployProxy() {
    // Setting up the deployment of a prxoy
    const { quiz, QUESTION } = await loadFixture(deployQuiz);
    const { factory } = await loadFixture(deployFactory);

    const Quiz = await ethers.getContractFactory("Quiz");

    // Deployment
    const txResponse = await factory.deploy(await quiz.getAddress());
    const txReceipt = await txResponse.wait();
    expect(txReceipt.logs[0].args[0]).to.not.be.equal(ethers.ZeroAddress);
    const proxyAddr = txReceipt.logs[0].args[0];
    const proxy = Quiz.attach(proxyAddr);

    return { proxy };
  }

  describe("Deployment", function () {
    it("Should not revert if a valid address is passed as an arg", async function () {
      const { quiz } = await loadFixture(deployQuiz);
      const { factory } = await loadFixture(deployFactory);

      await expect(factory.deploy(quiz.target)).to.not.be.reverted;
    });
  });

  describe("Interacting with proxy", function () {
    it("Should not revert when using the default getters", async function () {
      const { QUESTION } = await loadFixture(deployQuiz);
      const { proxy } = await loadFixture(deployProxy);

      // Proxy interaction
      expect(await proxy.answer()).to.be.equal(ethers.ZeroHash);
      expect(await proxy.winner()).to.be.equal(ethers.ZeroAddress);
      expect(await proxy.getQuestion()).to.be.equal(QUESTION);
      expect(await proxy.getPrizePool()).to.be.equal(0);
    });

    it("Should initialize proxy correctly", async function () {
      const { answer, finalAnswer } = await loadFixture(deployQuiz);
      const { proxy } = await loadFixture(deployProxy);

      const value = ethers.parseEther("1.0");

      const tx = await proxy.initialize(answer, {
        value: value,
      });
      await tx.wait();

      expect(await proxy.answer()).to.be.equal(finalAnswer);
      expect(await proxy.getPrizePool()).to.be.equal(value);
    });

    it("Should transfer funds if answered is guessed", async function () {
      const { answer, finalAnswer } = await loadFixture(deployQuiz);
      const { proxy } = await loadFixture(deployProxy);

      const [owner, ...other] = await ethers.getSigners();
      const value = ethers.parseEther("1.0");

      const tx = await proxy.initialize(answer, {
        value: value,
      });
      await tx.wait();

      expect(
        await proxy.connect(other[0]).guess("answer")
      ).to.changeEtherBalances([other[0], proxy], [value, -value]);

      expect(await proxy.winner()).to.be.equal(other[0].address);
    });
  });
});
