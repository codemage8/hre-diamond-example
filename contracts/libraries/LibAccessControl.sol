// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

bytes32 constant ROLE_DEFAULT_ADMIN = 0x00;

library LibAccessControl {
    bytes32 public constant ACCESSCONTROL_STORAGE_POSITION = keccak256("diamond.standard.accesscontrol.storage");

    struct RoleData {
        mapping(address => bool) hasRole;
        bytes32 adminRole;
    }

    struct AccessControlStorage {
        mapping(bytes32 => RoleData) roles; // Role for access control
    }

    function accessControlStorage() internal pure returns (AccessControlStorage storage s) {
        bytes32 position = ACCESSCONTROL_STORAGE_POSITION;
        // solhint-disable-next-line
        assembly {
            s.slot := position
        }
    }
}
