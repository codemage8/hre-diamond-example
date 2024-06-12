// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {AppStorage, LibAppStorage, MemberInfo} from "../libraries/LibAppStorage.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// @dev View methods to query Community State, not used by other factes
contract CommunityQueryFacet {
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.AddressSet;

    struct PartialCommunityState {
        address secretary;
        address token;
        uint256 states;
        uint256 currentPeriod;
        uint256 nextGroupId;
        uint256 numberOfGroups;
        uint256 numberOfAllMembers;
    }

    function queryState() external view returns (PartialCommunityState memory) {
        AppStorage storage s = LibAppStorage.appStorage();
        PartialCommunityState memory result;
        result.secretary = s.secretary;
        result.token = s.token;
        result.currentPeriod = s.currentPeriod;
        result.nextGroupId = s.nextGroupId;
        result.numberOfGroups = s.groups.length();
        result.numberOfAllMembers = s.membersAll.length();
        result.states = s.states;
        return result;
    }

    function queryGroupIds() external view returns (uint256[] memory) {
        AppStorage storage s = LibAppStorage.appStorage();
        uint256[] memory result = new uint256[](s.groups.length());
        for (uint256 i = 0; i < result.length; i++) {
            result[i] = uint256(s.groups.at(i));
        }
        return result;
    }

    function queryGroup(uint64 _groupId) external view returns (address[] memory all, address[] memory valid) {
        AppStorage storage s = LibAppStorage.appStorage();
        address[] memory membersValid = new address[](s.groupInfo[_groupId].membersValid.length());
        for (uint256 i = 0; i < membersValid.length; i++) {
            membersValid[i] = s.groupInfo[_groupId].membersValid.at(i);
        }

        address[] memory membersAll = new address[](s.groupInfo[_groupId].membersAll.length());
        for (uint256 i = 0; i < membersAll.length; i++) {
            membersAll[i] = s.groupInfo[_groupId].membersAll.at(i);
        }
        return (membersAll, membersValid);
    }

    function queryMember(address _user) external view returns (MemberInfo memory) {
        AppStorage storage s = LibAppStorage.appStorage();
        return s.memberInfo[_user];
    }

    function queryAllMembers() external view returns (address[] memory all, address[] memory valid) {
        AppStorage storage s = LibAppStorage.appStorage();
        address[] memory membersAll = new address[](s.membersAll.length());
        for (uint256 i = 0; i < membersAll.length; i++) {
            membersAll[i] = s.membersAll.at(i);
        }

        address[] memory membersValid = new address[](s.membersValid.length());
        for (uint256 i = 0; i < membersValid.length; i++) {
            membersValid[i] = s.membersValid.at(i);
        }
        return (membersAll, membersValid);
    }
}
