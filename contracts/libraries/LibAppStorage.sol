// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

struct GroupInfo {
    // @dev Current members in group, eligable for approving other members to join
    EnumerableSet.AddressSet membersValid;
    // @dev all members including waiting for joining
    EnumerableSet.AddressSet membersAll;
}

enum GroupJoinState {
    None,
    SecretaryAssigned,
    Accepted,
    Joined
}

struct MemberInfo {
    // @dev If this field is non zero, then it means the member is being re-orged.
    uint64 oldGroupId;
    uint64 groupId;
    GroupJoinState groupJoinState;
    // @dev store up to last 8 period states
    uint64 states;
}

struct AppStorage {
    address secretary;
    // @dev the address of the stable coin that is used in the community
    address token;
    // @dev store the state of the last 32 periods. (Last 1 byte indicates current period state)
    // When period advances, states are shifted
    uint256 states;
    // @dev starts from 0, 0 means the initialization state period
    uint64 currentPeriod;
    // @dev group Id counter, used to create a new group
    // Valid groupId should start from 1.
    uint64 nextGroupId;
    // @dev set of group identifiers
    EnumerableSet.UintSet groups;
    mapping(uint256 => GroupInfo) groupInfo;
    // @dev quick access to check which group the member belongs to
    mapping(address => MemberInfo) memberInfo;
    // @dev valid members
    EnumerableSet.AddressSet membersValid;
    // @dev total existing members in the community
    EnumerableSet.AddressSet membersAll;
}

library LibAppStorage {
    function appStorage() internal pure returns (AppStorage storage ds) {
        //solhint-disable-next-line no-inline-assembly
        assembly {
            ds.slot := 0
        }
    }
}
