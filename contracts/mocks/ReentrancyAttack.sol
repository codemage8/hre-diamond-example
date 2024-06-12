// SPDX-License-Identifier: MIT
// solhint-disable
pragma solidity ^0.8.24;

contract ReentrancyAttack {
    function callSender(bytes calldata data) public {
        (bool success, ) = address(msg.sender).call(data);
        require(success, "ReentrancyAttack: failed call");
    }
}
