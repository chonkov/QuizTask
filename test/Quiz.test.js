const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Quiz", function () {
  async function deployQuiz() {
    const QUESTION = "Can you guess the secret string?";

    const quiz = await ethers.deployContract("Quiz");
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

      expect(answer).to.be.equal(ethers.zeroPadBytes("0x00", 32));
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
    beforeEach(async function () {
      const { quiz, answer } = await loadFixture(deployQuiz);
      const [owner, other] = await ethers.getSigners();

      const value = ethers.parseEther("1");
      const guess2 = "answer2";

      let tx = await quiz.initialize(answer, {
        value: value,
      });
      await tx.wait();
    });

    async function initQuiz() {
      const { quiz, answer } = await loadFixture(deployQuiz);
      const [owner, ...other] = await ethers.getSigners();

      const value = ethers.parseEther("1");
      const guess = "answer";
      const guess2 = "answer2";

      const tx = await quiz.initialize(answer, {
        value: value,
      });
      await tx.wait();

      expect(await quiz.answer()).to.be.equal(answer);
      expect(await quiz.getPrizePool()).to.be.equal(value);

      return { quiz, owner, other, answer, guess, guess2, value };
    }

    it("Wrong guess - no winner && funds stay within the contract", async function () {
      const { quiz, other, guess2, value } = await loadFixture(initQuiz);
      const tx = await quiz.connect(other[0]).guess(guess2);
      await tx.wait();

      expect(await quiz.winner()).to.be.equal(ethers.ZeroAddress);
      expect(await quiz.getPrizePool()).to.be.equal(value);
    });

    it("Correct guess - winner is saved and funds are transferred", async function () {
      const { quiz, other, guess, value } = await loadFixture(initQuiz);

      expect(await quiz.connect(other[0]).guess(guess)).to.changeEtherBalances(
        [other[0], quiz],
        [value, -value]
      );

      expect(await quiz.winner()).to.be.equal(other[0].address);
      expect(await quiz.getPrizePool()).to.be.equal(0);
    });

    it("Correct guess - but a winner is already picked", async function () {
      const { quiz, owner, other, guess, value } = await loadFixture(initQuiz);
      const tx = await quiz.connect(other[0]).guess(guess);
      await tx.wait();

      await expect(
        quiz.connect(other[1]).guess(guess)
      ).to.be.revertedWithCustomError(quiz, `Quiz__WinnerExists`);

      await expect(
        owner.sendTransaction({ to: quiz, value: value })
      ).to.be.revertedWithCustomError(quiz, `Quiz__WinnerExists`);
    });
  });
});
