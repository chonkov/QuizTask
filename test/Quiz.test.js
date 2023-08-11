const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Quiz", function () {
  async function deployQuiz() {
    const QUESTION = "Can you guess the secret string?";
    const SALT = "Random salt prepended to the msg";

    const quiz = await ethers.deployContract("Quiz");
    await quiz.waitForDeployment();

    const answer = await quiz.getHash("answer");
    const finalAnswer = await quiz.getHashWithSalt(answer);

    return { quiz, QUESTION, SALT, answer, finalAnswer };
  }

  describe("Deployment", function () {
    it("Should return the question as a constant", async function () {
      const { quiz, QUESTION } = await loadFixture(deployQuiz);

      expect(await quiz.getQuestion()).to.equal(QUESTION);
    });
  });

  describe("Receiving funds", function () {
    it("Should accept funds through receive function", async function () {
      const { quiz } = await loadFixture(deployQuiz);

      const [owner] = await ethers.getSigners();
      const amount = ethers.parseEther("1");
      await expect(owner.sendTransaction({ to: quiz, value: amount })).to.not.be
        .reverted;
    });
  });

  describe("Initialization", function () {
    it("Should have an empty answer", async function () {
      const { quiz } = await loadFixture(deployQuiz);
      const answer = await quiz.answer();

      expect(answer).to.be.equal(ethers.zeroPadBytes("0x00", 32));
    });

    it("Should set the answer correctly", async function () {
      const { quiz, answer, finalAnswer } = await loadFixture(deployQuiz);

      const tx = await quiz.initialize(answer);
      await tx.wait();

      expect(await quiz.answer()).to.be.equal(finalAnswer);
    });

    it("Should fail if somebody tries to change the answer", async function () {
      const { quiz, answer, finalAnswer } = await loadFixture(deployQuiz);

      const tx = await quiz.initialize(answer);
      await tx.wait();

      expect(await quiz.answer()).to.be.equal(finalAnswer);

      const answer2 = await quiz.getHash("answer2");

      await expect(quiz.initialize(answer2)).to.be.revertedWithCustomError(
        quiz,
        `Quiz__SecondInitialization`
      );
    });

    it("Should emit an event", async function () {
      const { quiz, answer } = await loadFixture(deployQuiz);

      expect(await quiz.initialize(answer))
        .to.emit(quiz, "Initialized")
        .withArgs(quiz.target, answer);
    });
  });

  describe("Guessing", function () {
    async function initQuiz() {
      const { quiz, answer, finalAnswer } = await loadFixture(deployQuiz);
      const [owner, ...other] = await ethers.getSigners();

      const value = ethers.parseEther("1");
      const guess = "answer";
      const guess2 = "answer2";

      const tx = await quiz.initialize(answer, {
        value: value,
      });
      await tx.wait();

      expect(await quiz.answer()).to.be.equal(finalAnswer);
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

    it("Correct guess - winner is saved", async function () {
      const { quiz, other, guess } = await loadFixture(initQuiz);
      const tx = await quiz.connect(other[0]).guess(guess);
      await tx.wait();

      expect(await quiz.winner()).to.be.equal(other[0].address);
    });

    it("Correct guess - funds are transferred", async function () {
      const { quiz, other, guess, value } = await loadFixture(initQuiz);

      expect(await quiz.connect(other[0]).guess(guess)).to.changeEtherBalances(
        [other[0], quiz],
        [value, -value]
      );
      expect(await quiz.getPrizePool()).to.be.equal(0);
    });

    it("Correct guess - an event is emitted", async function () {
      const { quiz, other, guess, value } = await loadFixture(initQuiz);

      expect(await quiz.connect(other[0]).guess(guess))
        .to.emit(quiz, "AnswerGuessed")
        .withArgs(other[0].address, guess);
    });

    it("Correct guess - but a winner is already picked", async function () {
      const { quiz, owner, other, guess, value } = await loadFixture(initQuiz);
      const tx = await quiz.connect(other[0]).guess(guess);
      await tx.wait();

      await expect(
        quiz.connect(other[1]).guess(guess)
      ).to.be.revertedWithCustomError(quiz, `Quiz__WinnerExists`);
    });

    it("Send funds - but a winner is already picked", async function () {
      const { quiz, owner, other, guess, value } = await loadFixture(initQuiz);
      const tx = await quiz.connect(other[0]).guess(guess);
      await tx.wait();

      await expect(
        owner.sendTransaction({ to: quiz, value: value })
      ).to.be.revertedWithCustomError(quiz, `Quiz__WinnerExists`);
    });
  });
});
