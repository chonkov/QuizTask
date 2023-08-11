// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol";

/* is Ownable(tx.origin) */

error Quiz__SecondInitialization();
error Quiz__WinnerExists();

contract Quiz {
    event Initialized(address indexed, bytes32 indexed);
    event AnswerGuessed(address indexed, string indexed);

    bytes32 internal constant QUESTION = "Can you guess the secret string?";
    bytes32 internal constant SALT = "Random salt prepended to the msg";
    bytes32 public answer;
    address public winner;

    modifier noWinnerExists() {
        if (!_noWinnerExists()) {
            revert Quiz__WinnerExists();
        }
        _;
    }

    function _noWinnerExists() internal view returns (bool) {
        return winner == address(0);
    }

    // Make sure initialize can be called only once
    function initialize(bytes32 _answer) external payable {
        if (answer != bytes32(0)) {
            revert Quiz__SecondInitialization();
        }
        answer = keccak256(abi.encode(SALT, _answer));

        emit Initialized(address(this), _answer);
    }

    function getHash(string memory str) external pure returns (bytes32) {
        return keccak256(abi.encode(str));
    }

    function getHashWithSalt(bytes32 _answer) external pure returns (bytes32) {
        return keccak256(abi.encode(SALT, _answer));
    }

    function getQuestion() external pure returns (string memory) {
        return string(abi.encode(QUESTION));
    }

    function getPrizePool() external view returns (uint) {
        return address(this).balance;
    }

    function guess(
        string memory _guess
    ) external noWinnerExists returns (bool) {
        bytes32 hash = keccak256(
            abi.encode(SALT, keccak256(abi.encode(_guess)))
        );
        if (hash == answer) {
            winner = msg.sender;
            payable(winner).transfer(address(this).balance);
            emit AnswerGuessed(msg.sender, _guess);
            return true;
        }
        return false;
    }

    receive() external payable {
        if (!_noWinnerExists()) {
            revert Quiz__WinnerExists();
        }
    }
}
