// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {CommunityRoleModifiers} from "../libraries/Modifiers.sol";
import {ReentrancyGuard} from "../libraries/ReentrancyGuard.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {AppStorage, LibAppStorage, GroupJoinState, MemberInfo} from "../libraries/LibAppStorage.sol";
import {LibMeta} from "../libraries/LibMeta.sol";
import {LibCommunity, MemberState} from "../libraries/LibCommunity.sol";

// @dev
contract GroupFacet is CommunityRoleModifiers, ReentrancyGuard {
    error GroupAddCannotAddSecretary(address user);
    error GroupAddCommunityFull();
    error GroupAddAlreadyAdded(address user);
    error GroupAssignInvalidGroup(uint64 groupId);
    error GroupAssignMemberNotJoined(uint64 groupId, address user);
    error GroupAssignToSameGroup(uint64 groupId, address user);
    error GroupAssignMaximumReached(uint64 groupId);
    error GroupAcceptInvalidGroupId(uint64 groupId, uint64 memberGroupId, address user);
    error GroupAcceptNotInMembersList(uint64 groupId, address user);
    error GroupApproveInvalidGroupId(uint64 groupId);
    error GroupApproveInvalidApprover(uint64 groupId, address approver);
    error GroupApproveInvalidMember(uint64 groupId, uint64 memberGroupId, address user, GroupJoinState groupJoinState);

    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;
    /**
      @dev add a new member to the group.
     */
    function groupAddToCommunity(address _user) external onlySecretary noZeroAddress(_user) {
        AppStorage storage s = LibAppStorage.appStorage();
        // Can not add user as secretary
        if (_user == s.secretary) {
            revert GroupAddCannotAddSecretary(_user);
        }
        // Check if already reached maximum members
        if (s.membersAll.length() >= LibCommunity.COMMUNITY_MAX_SIZE) {
            revert GroupAddCommunityFull();
        }
        // Only fresh new members can be added
        if (s.membersAll.contains(_user)) {
            revert GroupAddAlreadyAdded(_user);
        }

        // Initialize the member state, clean up variables to make sure everything okay
        // Directly assigning _states to clear all the history
        s.memberInfo[_user].states = MemberState.NEW;
        s.memberInfo[_user].groupId = 0;
        s.memberInfo[_user].oldGroupId = 0;
        s.membersAll.add(_user);
    }

    /**
      @dev assign a member to the group.
     */
    function groupAssign(uint64 _groupId, address _user) external onlySecretary {
        AppStorage storage s = LibAppStorage.appStorage();

        // @dev prevent use of non-existing group, to use it pass 0 as _groupId
        if (_groupId > 0 && !s.groups.contains(_groupId)) {
            revert GroupAssignInvalidGroup(_groupId);
        }

        // Can not add non-existing user
        if (!s.membersAll.contains(_user)) {
            revert GroupAssignMemberNotJoined(_groupId, _user);
        }

        uint64 currentGroupId = s.memberInfo[_user].groupId;

        // Revert if the same group is being assigned
        if (_groupId > 0 && currentGroupId == _groupId) {
            revert GroupAssignToSameGroup(_groupId, _user);
        }

        uint64 nextGroupId = s.nextGroupId;
        if (_groupId == 0) {
            _groupId = nextGroupId;
            nextGroupId++;
        }

        // Check if there are more than 7 people assigned to the community
        if (s.groupInfo[_groupId].membersAll.length() >= LibCommunity.COMMUNITY_MAX_GROUP_SIZE) {
            revert GroupAssignMaximumReached(_groupId);
        }

        if (currentGroupId > 0) {
            // Remove the member from old group
            s.groupInfo[currentGroupId].membersValid.remove(_user);
            s.groupInfo[currentGroupId].membersAll.remove(_user);

            // Check if the group can be removed from groups list.
            _checkGroupAndRemove(currentGroupId);
        }

        // Update the next group id
        if (s.nextGroupId != nextGroupId) {
            s.nextGroupId = nextGroupId;
            // Add to valid groups when new group is created.
            s.groups.add(uint256(_groupId));
        }

        // Add to the all members list
        s.groupInfo[_groupId].membersAll.add(_user);
        s.memberInfo[_user].oldGroupId = currentGroupId;
        s.memberInfo[_user].groupId = _groupId;
        s.memberInfo[_user].groupJoinState = GroupJoinState.SecretaryAssigned;
    }

    /**
        @dev Member agrees the group assignment by secretary
     */
    function groupAccept(uint64 _groupId) external noSecretaryCall onlyMember {
        AppStorage storage s = LibAppStorage.appStorage();
        address _user = LibMeta.msgSender();
        MemberInfo memory info = s.memberInfo[_user];

        if (info.groupId != _groupId || !s.groups.contains(_groupId)) {
            revert GroupAcceptInvalidGroupId(_groupId, info.groupId, _user);
        }

        // @dev Double check if the user is in the members list,
        // To verify the integrity of the groupAssignMember method.
        if (!s.groupInfo[_groupId].membersAll.contains(_user)) {
            revert GroupAcceptNotInMembersList(_groupId, _user);
        }

        if (info.oldGroupId == 0 || s.groupInfo[_groupId].membersValid.length() == 0) {
            // If this member is newly joining, update the group join state as joined, or if there's no valid members.
            _markUserJoined(_groupId, _user);
            return;
        }
        // Otherwise should wait for the approval, make the member state to MemberAccepted.
        s.memberInfo[_user].groupJoinState = GroupJoinState.Accepted;
    }

    // @dev Approve by other valid member in the group
    function groupApprove(uint64 _groupId, address _user) external noSecretaryCall onlyMember {
        AppStorage storage s = LibAppStorage.appStorage();
        address _sender = LibMeta.msgSender();

        if (!s.groups.contains(_groupId)) {
            revert GroupApproveInvalidGroupId(_groupId);
        }

        bool canApprove = s.memberInfo[_sender].groupId == _groupId &&
            s.memberInfo[_sender].groupJoinState == GroupJoinState.Joined &&
            s.groupInfo[_groupId].membersValid.contains(_sender);

        if (!canApprove) {
            revert GroupApproveInvalidApprover(_groupId, _sender);
        }

        bool memberCanBeApproved = s.memberInfo[_user].groupId == _groupId &&
            s.memberInfo[_user].groupJoinState == GroupJoinState.Accepted &&
            s.groupInfo[_groupId].membersAll.contains(_user);

        if (!memberCanBeApproved) {
            // Only valid request will be accepted.
            revert GroupApproveInvalidMember(
                _groupId,
                s.memberInfo[_user].groupId,
                _user,
                s.memberInfo[_user].groupJoinState
            );
        }
        _markUserJoined(_groupId, _user);
    }

    // @dev when no members, remove the group
    function _checkGroupAndRemove(uint64 _groupId) private {
        if (_groupId == 0) {
            return;
        }
        AppStorage storage s = LibAppStorage.appStorage();
        if (s.groupInfo[_groupId].membersValid.length() > 0) {
            return;
        }
        if (s.groupInfo[_groupId].membersAll.length() > 0) {
            return;
        }
        // Remove group when no members exist
        s.groups.remove(_groupId);
    }

    // @dev Utility function to mark the user as valid member of the group
    function _markUserJoined(uint64 _groupId, address _user) private {
        AppStorage storage s = LibAppStorage.appStorage();
        // Once the user is successfully entered a group, it should be marked as valid member.
        s.membersValid.add(_user);
        s.memberInfo[_user].groupJoinState = GroupJoinState.Joined;
        s.groupInfo[_groupId].membersValid.add(_user);

        // When the user joined from other group, then mark the user state as ReOrged.
        if (s.memberInfo[_user].oldGroupId != 0) {
            LibCommunity.setMemberState(_user, MemberState.REORGED);
        }
    }
}
