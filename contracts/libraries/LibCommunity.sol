// SPDX-License-Identifier: GPL-3.0
// solhint-disable one-contract-per-file
pragma solidity ^0.8.24;

import {AppStorage, LibAppStorage} from "./LibAppStorage.sol";

library MemberState {
    uint8 public constant NONE = 0;
    uint8 public constant NEW = 1;
    uint8 public constant VALID = 2;
    uint8 public constant PAID_INVALID = 3;
    uint8 public constant UNPAID_INVALID = 4;
    uint8 public constant REORGED = 5;
    uint8 public constant USERLEFT = 6;
    uint8 public constant DEFECTED = 7;
    uint8 public constant USER_QUIT = 8;
}

library CommunityState {
    uint8 public constant INIT = 0;
    uint8 public constant DEFAULT = 1;
    uint8 public constant FRACTURED = 2;
    uint8 public constant COLLAPSED = 3;
}

library LibCommunity {
    uint256 public constant COMMUNITY_MIN_SIZE = 12;
    uint256 public constant COMMUNITY_MAX_SIZE = 150;
    uint256 public constant COMMUNITY_MIN_GROUP_SIZE = 4;
    uint256 public constant COMMUNITY_MAX_GROUP_SIZE = 7;

    // @dev get member's current period's state
    function setMemberState(address _user, uint8 _state) internal {
        AppStorage storage s = LibAppStorage.appStorage();
        uint64 masked = s.memberInfo[_user].states & 0xFFFFFFFFFFFFFF00;
        s.memberInfo[_user].states = masked | _state;
    }

    // @dev set member's current period's state
    function getMemberState(address _user) internal view returns (uint8) {
        return uint8(LibAppStorage.appStorage().memberInfo[_user].states & 0xFF);
    }

    // @dev get community's current period's state
    function getCommunityState() internal view returns (uint8) {
        return uint8(LibAppStorage.appStorage().states & 0xFF);
    }
}
