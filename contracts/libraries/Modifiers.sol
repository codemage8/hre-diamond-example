// SPDX-License-Identifier: GPL-3.0
// solhint-disable one-contract-per-file
pragma solidity ^0.8.24;

import {LibAccessControl} from "./LibAccessControl.sol";
import {LibMeta} from "./LibMeta.sol";
import {AppStorage, LibAppStorage} from "./LibAppStorage.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

abstract contract AccessControlModifiers {
    modifier onlyRole(bytes32 _role) {
        LibAccessControl.AccessControlStorage storage s = LibAccessControl.accessControlStorage();
        address _sender = LibMeta.msgSender();
        if (!s.roles[_role].hasRole[_sender]) {
            revert IAccessControl.AccessControlUnauthorizedAccount(_sender, _role);
        }
        _;
    }
}

abstract contract CommunityRoleModifiers {
    using EnumerableSet for EnumerableSet.AddressSet;

    error OnlyAllowedFromSecretary();
    error ZeroAddressNotAllowed();
    error CannotCallFromSecretary();
    error OnlyAllowedFromMember();

    modifier onlySecretary() {
        AppStorage storage s = LibAppStorage.appStorage();
        if (LibMeta.msgSender() != s.secretary) {
            revert OnlyAllowedFromSecretary();
        }
        _;
    }

    modifier noZeroAddress(address _user) {
        if (_user == address(0)) {
            revert ZeroAddressNotAllowed();
        }
        _;
    }

    modifier noSecretaryCall() {
        AppStorage storage s = LibAppStorage.appStorage();
        if (LibMeta.msgSender() == s.secretary) {
            revert CannotCallFromSecretary();
        }
        _;
    }

    modifier onlyMember() {
        AppStorage storage s = LibAppStorage.appStorage();
        if (!s.membersAll.contains(LibMeta.msgSender())) {
            revert OnlyAllowedFromMember();
        }
        _;
    }
}
