// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
*
* Implementation of a diamond.
/******************************************************************************/

import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";
import {LibAccessControl, ROLE_DEFAULT_ADMIN} from "../libraries/LibAccessControl.sol";

// It is expected that this contract is customized if you want to deploy your diamond
// with data from a deployment script. Use the init function to initialize state variables
// of your diamond. Add parameters to the init funciton if you need to.

contract AccessControlInit {
    // You can add parameters to this function in order to pass in
    // data to set your own state variables
    function init() external {
        // adding ERC165 data
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.supportedInterfaces[type(IAccessControl).interfaceId] = true;

        // Access Control
        LibAccessControl.AccessControlStorage storage acs = LibAccessControl.accessControlStorage();
        // Assign admin role to the deployer
        acs.roles[ROLE_DEFAULT_ADMIN].hasRole[msg.sender] = true;
        emit IAccessControl.RoleGranted(ROLE_DEFAULT_ADMIN, msg.sender, msg.sender);
        // add your own state variables
        // EIP-2535 specifies that the `diamondCut` function takes two optional
        // arguments: address _init and bytes calldata _calldata
        // These arguments are used to execute an arbitrary function using delegatecall
        // in order to set state variables in the diamond during deployment or an upgrade
        // More info here: https://eips.ethereum.org/EIPS/eip-2535#diamond-interface
    }
}
