// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract Factory {
    /*
    
    The question can be passed as a string and the answer as bytes32 as args and a delegate call
    can be made to `result` after the contract has been created in order to set up all vars

    */
    function deploy(address target) external returns (address result) {
        bytes20 targetBytes = bytes20(target);

        assembly {
            let freeMemPtr := mload(0x40)
            // store in memory creation code and first part of the runtime code
            mstore(
                freeMemPtr,
                0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000
            )
            // store the address to which all delegated calls will be forwarded
            mstore(add(freeMemPtr, 0x14), targetBytes)
            // store second part of the runtime code
            mstore(
                add(freeMemPtr, 0x28),
                0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000
            )
            // create a contract with bytes stored in memory and upoc successful creation return the address
            result := create(0, freeMemPtr, 0x37)

            // if result
            // {
            //     delegatecall()
            // }
        }
    }
}
