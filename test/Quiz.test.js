const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Quiz", function () {
  async function deployOneYearLockFixture() {
    const QUESTION = "Can you guess the secret string?";

    const Quiz = await ethers.getContractFactory("Quiz");
    const quiz = await Quiz.deploy();

    return { quiz, QUESTION };
  }

  describe("Deployment", function () {
    it("Should return the question as a constant", async function () {
      const { quiz, QUESTION } = await loadFixture(deployOneYearLockFixture);

      expect(await quiz.getQuestion()).to.equal(QUESTION);
    });
  });

  describe("Initialization", function () {
    describe("Validations", function () {
      it("Should have an empty answer", async function () {
        const { quiz } = await loadFixture(deployOneYearLockFixture);
        const answer = await quiz.answer();

        expect(answer).to.be.equal(
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Should set the answer correctly", async function () {
        const { quiz } = await loadFixture(deployOneYearLockFixture);
        const answer = await quiz.getHash("answer");

        const tx = await quiz.initialize(answer);
        await tx.wait();

        expect(await quiz.answer()).to.be.equal(answer);
      });

      it("Should fail if somebody tries to change the answer", async function () {
        const { quiz } = await loadFixture(deployOneYearLockFixture);
        const answer = await quiz.getHash("answer");

        const tx = await quiz.initialize(answer);

        expect(await quiz.answer()).to.be.equal(answer);

        const answer2 = await quiz.getHash("answer2");

        await expect(quiz.initialize(answer2)).to.be.revertedWithCustomError(
          quiz,
          `Quiz__SecondInitialization`
        );
      });
    });
  });
});
