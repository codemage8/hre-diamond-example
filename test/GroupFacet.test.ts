import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers, ignition } from 'hardhat'
import { FacetCutAction, executeDiamondCut } from '~/scripts/diamond'
import { GroupJoinState, MemberState, communityTestModule } from './util'

const deployContracts = async () => {
  const [owner, secretary, other, ...accounts] = await ethers.getSigners()
  const { diamond, groupFacet, communityQueryFacet, communityInit, erc20Mock } =
    await ignition.deploy(communityTestModule)

  const diamondAddress = await diamond.getAddress()

  // call diamond cut
  await executeDiamondCut({
    diamond,
    facets: [groupFacet, communityQueryFacet],
    action: FacetCutAction.Add,
    cutInitParams: {
      address: await communityInit.getAddress(),
      callData: communityInit.interface.encodeFunctionData('init', [
        { secretary: secretary.address, token: await erc20Mock.getAddress() },
      ]),
    },
  })

  return {
    diamond,
    diamondAddress,
    // Connect to secretary by default
    communityQueryFacet: (
      await ethers.getContractAt('CommunityQueryFacet', diamondAddress)
    ).connect(secretary),
    groupFacet: (await ethers.getContractAt('GroupFacet', diamondAddress)).connect(secretary),
    erc20Mock,
    owner,
    secretary,
    accounts,
    other,
  }
}

describe('GroupFacetTest', () => {
  let ctx: Awaited<ReturnType<typeof deployContracts>>
  beforeEach(async () => {
    ctx = await loadFixture(deployContracts)
  })

  it('add to group should work correct', async () => {
    const { groupFacet, communityQueryFacet, other, secretary, accounts } = ctx

    // Add zero address member should fail
    await expect(groupFacet.groupAddToCommunity(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      groupFacet,
      'ZeroAddressNotAllowed'
    )

    // Only secretary can call group add
    await expect(
      groupFacet.connect(other).groupAddToCommunity(secretary)
    ).to.be.revertedWithCustomError(groupFacet, 'OnlyAllowedFromSecretary')

    // Secretary cannot be added to group
    await expect(groupFacet.groupAddToCommunity(secretary))
      .to.be.revertedWithCustomError(groupFacet, 'GroupAddCannotAddSecretary')
      .withArgs(secretary)

    // Add a member should be succeeded
    await groupFacet.groupAddToCommunity(other)

    // should have member in the membersAll array
    const result = await communityQueryFacet.queryAllMembers()
    expect([...result.all]).to.have.same.members([other.address])

    const member = await communityQueryFacet.queryMember(other)
    expect(member.oldGroupId).equal(0n)
    expect(member.groupId).equal(0n)
    expect(Number(member.states) & 255).equal(MemberState.New) // MemberState.New is 1

    // Trying to add the same member again will be rejected
    await expect(groupFacet.groupAddToCommunity(other))
      .to.be.revertedWithCustomError(groupFacet, 'GroupAddAlreadyAdded')
      .withArgs(other.address)

    await groupFacet.groupAddToCommunity(accounts[0])

    // Check if community state is updating correctly
    const communityState = await communityQueryFacet.queryState()
    // There are two groups created, so the next groupId should be 3
    expect(communityState.nextGroupId).equal(1n)
    expect(communityState.numberOfGroups).equal(0n)
    expect(communityState.numberOfAllMembers).equal(2n)
  })

  it('assigning to group should work correctly', async () => {
    const { groupFacet, other, accounts, communityQueryFacet } = ctx
    // Add some members to the community
    await groupFacet.groupAddToCommunity(other)
    await Promise.all(
      Array(10)
        .fill(0)
        .map((_, i) => groupFacet.groupAddToCommunity(accounts[i]))
    )

    // Trying to call assign from non-secretary account will cause failure
    await expect(groupFacet.connect(other).groupAssign(0, other)).to.be.revertedWithCustomError(
      groupFacet,
      'OnlyAllowedFromSecretary'
    )

    // Assign to non-existing/invalid group will cause failure
    await expect(groupFacet.groupAssign(3, other))
      .to.be.revertedWithCustomError(groupFacet, 'GroupAssignInvalidGroup')
      .withArgs(3)

    // Assign non existing member will fail
    await expect(groupFacet.groupAssign(0, accounts[100]))
      .to.be.revertedWithCustomError(groupFacet, 'GroupAssignMemberNotJoined')
      .withArgs(0, accounts[100].address)

    // Assign a member to a new group
    await groupFacet.groupAssign(0, other)

    const groupId = (await communityQueryFacet.queryGroupIds())[0]
    expect(groupId).equal(1n)

    let member = await communityQueryFacet.queryMember(other)
    expect(member.oldGroupId).equal(0n)
    expect(member.groupId).equal(1n)
    expect(member.groupJoinState).equal(BigInt(GroupJoinState.SecretaryAssigned)) // Secretary Assigned State

    // Assign the same member to the group again
    await expect(groupFacet.groupAssign(groupId, other))
      .to.be.revertedWithCustomError(groupFacet, 'GroupAssignToSameGroup')
      .withArgs(groupId, other)

    // Group's all member should contain the same member
    const groupMembersAll = (await communityQueryFacet.queryGroup(groupId)).all
    expect([...groupMembersAll]).to.have.same.members([other.address])

    // Check maximum members assignment
    await Promise.all(
      Array(6)
        .fill(0)
        .map((_, i) => groupFacet.groupAssign(groupId, accounts[i]))
    )
    await expect(groupFacet.groupAssign(groupId, accounts[6]))
      .to.be.revertedWithCustomError(groupFacet, 'GroupAssignMaximumReached')
      .withArgs(groupId)

    // Assign member to other group
    await groupFacet.groupAssign(0, other)

    // Community state update check
    let communityState = await communityQueryFacet.queryState()
    // There are two groups created, so the next groupId should be 3
    expect(communityState.nextGroupId).equal(3n)
    expect(communityState.numberOfGroups).equal(2n)

    member = await communityQueryFacet.queryMember(other)
    expect(member.oldGroupId).equal(1n) // Old GroupId should be 1
    expect(member.groupId).equal(2) // New groupId should be 2
    expect(member.groupJoinState).equal(BigInt(GroupJoinState.SecretaryAssigned)) // Secretary Assigned State

    // After moving, group2 members should contain other address
    const group2Members = (await communityQueryFacet.queryGroup(2)).all
    expect([...group2Members]).to.have.same.members([other.address])
  })
})

describe('GroupFacetTest', () => {
  const deployAndPreTransactions = async () => {
    const result = await deployContracts()
    const { groupFacet, other, accounts } = result
    // add members to group
    await Promise.all(
      [other, accounts[0], accounts[1], accounts[2], accounts[3]].map((acc) =>
        groupFacet.groupAddToCommunity(acc)
      )
    )

    // assign to group
    await groupFacet.groupAssign(0, other)
    await Promise.all(
      [accounts[0], accounts[1], accounts[2], accounts[3]].map((acc) =>
        groupFacet.groupAssign(1, acc)
      )
    )
    return result
  }
  let ctx: Awaited<ReturnType<typeof deployAndPreTransactions>>

  before(async () => {
    ctx = await loadFixture(deployAndPreTransactions)
  })

  it('call from secretary should be rejected', async () => {
    const { groupFacet } = ctx

    // Secretary cannot call the accept function
    await expect(groupFacet.groupAccept(1)).to.be.revertedWithCustomError(
      groupFacet,
      'CannotCallFromSecretary'
    )
  })

  it('should reject invalid group id', async () => {
    const { groupFacet, other, accounts } = ctx
    // Member cannot call the accept function
    await expect(groupFacet.connect(accounts[10]).groupAccept(1)).to.be.revertedWithCustomError(
      groupFacet,
      'OnlyAllowedFromMember'
    )

    // Trying to accept invalid group should be rejected
    await expect(groupFacet.connect(other).groupAccept(2))
      .to.be.revertedWithCustomError(groupFacet, 'GroupAcceptInvalidGroupId')
      .withArgs(2, 1, other.address)
  })

  it('should join group immediately on accept when no members', async () => {
    const { groupFacet, other, communityQueryFacet } = ctx
    await groupFacet.connect(other).groupAccept(1)

    const memberInfo = await communityQueryFacet.queryMember(other)
    expect(memberInfo.groupId).equal(1n)
    expect(memberInfo.groupJoinState).equal(GroupJoinState.Joined)

    const groupInfo = await communityQueryFacet.queryGroup(1)
    // Valid members list should contain joined user
    expect([...groupInfo.valid]).to.contain(other.address)
  })

  it('should join group immediately when newly joined', async () => {
    const { groupFacet, communityQueryFacet, accounts } = ctx
    await groupFacet.connect(accounts[0]).groupAccept(1)

    const memberInfo = await communityQueryFacet.queryMember(accounts[0])
    expect(memberInfo.groupId).equal(1n)
    expect(memberInfo.groupJoinState).equal(GroupJoinState.Joined)
  })

  it('should wait for approval when coming from other group', async () => {
    const { groupFacet, communityQueryFacet, accounts, other } = ctx

    const other1 = accounts[10]
    // account[10] joins a brand new group
    await groupFacet.groupAddToCommunity(other1)
    await groupFacet.groupAssign(0, other1)
    await groupFacet.connect(other1).groupAccept(2)

    // Now secretary will assign another group to account[10]
    await groupFacet.groupAssign(1, other1)
    let memberInfo = await communityQueryFacet.queryMember(other1)
    expect(memberInfo.oldGroupId).equal(2)
    expect(memberInfo.groupId).equal(1)
    expect(memberInfo.groupJoinState).equal(GroupJoinState.SecretaryAssigned)

    // Query relevant groups
    let group1 = await communityQueryFacet.queryGroup(1)
    // should be member but not valid
    expect([...group1.all]).contain(other1.address)
    expect([...group1.valid]).not.to.contain(other1.address)

    const group2 = await communityQueryFacet.queryGroup(2)
    // should be removed from group2 completely
    expect([...group2.all]).not.to.contain(other1.address)
    expect([...group2.valid]).not.to.contain(other1.address)

    // Now accepts new group
    await groupFacet.connect(other1).groupAccept(1)
    memberInfo = await communityQueryFacet.queryMember(other1)
    expect(memberInfo.groupJoinState).equal(GroupJoinState.Accepted)

    // One of the member in group1 will accept
    await groupFacet.connect(other).groupApprove(1, other1)
    memberInfo = await communityQueryFacet.queryMember(other1)
    expect(memberInfo.groupJoinState).equal(GroupJoinState.Joined)
    expect(memberInfo.oldGroupId).equal(2)
    expect(Number(memberInfo.states) & 255).equal(MemberState.ReOrged)

    group1 = await communityQueryFacet.queryGroup(1)
    // should be member but not valid
    expect([...group1.all]).contain(other1.address)
    expect([...group1.valid]).contain(other1.address)
  })
})
