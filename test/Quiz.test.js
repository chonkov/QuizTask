const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Quiz", function () {
  async function deployQuiz() {
    const QUESTION = "Can you guess the secret string?";

    const quiz = await ethers.deployContract("Quiz");
    // const quiz = await Quiz.deploy();
    await quiz.waitForDeployment();

    const answer = await quiz.getHash("answer");

    return { quiz, QUESTION, answer };
  }

  describe("Deployment", function () {
    it("Should return the question as a constant", async function () {
      const { quiz, QUESTION } = await loadFixture(deployQuiz);

      expect(await quiz.getQuestion()).to.equal(QUESTION);
    });
  });

  describe("Initialization", function () {
    it("Should have an empty answer", async function () {
      const { quiz } = await loadFixture(deployQuiz);
      const answer = await quiz.answer();

      expect(answer).to.be.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Should set the answer correctly", async function () {
      const { quiz, answer } = await loadFixture(deployQuiz);

      const tx = await quiz.initialize(answer);
      await tx.wait();

      expect(await quiz.answer()).to.be.equal(answer);
    });

    it("Should fail if somebody tries to change the answer", async function () {
      const { quiz, answer } = await loadFixture(deployQuiz);

      const tx = await quiz.initialize(answer);

      expect(await quiz.answer()).to.be.equal(answer);

      const answer2 = await quiz.getHash("answer2");

      await expect(quiz.initialize(answer2)).to.be.revertedWithCustomError(
        quiz,
        `Quiz__SecondInitialization`
      );
    });
  });

  describe("Guessing", function () {
    it("Wrong guess - no winner && funds stay within the contract", async function () {
      const { quiz, answer } = await loadFixture(deployQuiz);
      const [owner, other] = await ethers.getSigners();

      const value = ethers.parseEther("1");
      const answer2 = "answer2";

      let tx = await quiz.initialize(answer, {
        value: value,
      });
      await tx.wait();

      expect(await quiz.answer()).to.be.equal(answer);
      expect(await quiz.getPrizePool()).to.be.equal(value);

      tx = await quiz.guess(answer2);
      await tx.wait();

      expect(await quiz.winner()).to.be.equal(
        "0x0000000000000000000000000000000000000000"
      );
      expect(await quiz.getPrizePool()).to.be.equal(value);
    });
  });
});
