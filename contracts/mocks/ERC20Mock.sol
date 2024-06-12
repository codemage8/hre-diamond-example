// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20 {
    constructor(uint256 initialSupply) ERC20("ERC20Mock", "MCK") {
        _mint(msg.sender, initialSupply);
    }
}
