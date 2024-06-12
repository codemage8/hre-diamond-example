// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {LibAccessControl} from "../libraries/LibAccessControl.sol";
import {AccessControlModifiers} from "../libraries/Modifiers.sol";
import {LibMeta} from "../libraries/LibMeta.sol";

contract AccessControlFacet is AccessControlModifiers, IAccessControl {
    function hasRole(bytes32 role, address account) public view virtual override returns (bool) {
        LibAccessControl.AccessControlStorage storage s = LibAccessControl.accessControlStorage();
        return s.roles[role].hasRole[account];
    }

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) public view virtual override returns (bytes32) {
        LibAccessControl.AccessControlStorage storage s = LibAccessControl.accessControlStorage();
        return s.roles[role].adminRole;
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function grantRole(bytes32 role, address account) public virtual override onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function revokeRole(bytes32 role, address account) public virtual override onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
    }

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been revoked `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `account`.
     */
    function renounceRole(bytes32 role, address callerConfirmation) public virtual override {
        if (callerConfirmation != LibMeta.msgSender()) {
            revert AccessControlBadConfirmation();
        }
        _revokeRole(role, callerConfirmation);
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * Internal function without access restriction.
     */
    function _grantRole(bytes32 role, address account) internal virtual {
        LibAccessControl.AccessControlStorage storage s = LibAccessControl.accessControlStorage();
        if (!hasRole(role, account)) {
            s.roles[role].hasRole[account] = true;
            emit RoleGranted(role, account, LibMeta.msgSender());
        }
    }

    /**
     * @dev Revokes `role` from `account`.
     *
     * Internal function without access restriction.
     */
    function _revokeRole(bytes32 role, address account) internal virtual {
        LibAccessControl.AccessControlStorage storage s = LibAccessControl.accessControlStorage();
        if (hasRole(role, account)) {
            s.roles[role].hasRole[account] = false;
            emit RoleRevoked(role, account, LibMeta.msgSender());
        }
    }
}
