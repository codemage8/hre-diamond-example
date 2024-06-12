import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import CommunityModule from '~/ignition/modules/Community'
import DiamondModule from '~/ignition/modules/Diamond'
import ERC20Mock from '~/ignition/modules/ERC20Mock'

export enum CommunityState {
  Init,
  Default,
  Fractured,
  Collapsed,
}

export enum MemberState {
  None,
  New,
  Valid,
  PaidInvalid,
  UnpaidInvalid,
  ReOrged,
  UserLeft,
  Defected,
  UserQuit,
}

export enum GroupJoinState {
  None,
  SecretaryAssigned,
  Accepted,
  Joined,
}

export const communityTestModule = buildModule('CommunityTestModule', (m) => {
  const { diamond } = m.useModule(DiamondModule)
  const { groupFacet, communityInit, communityQueryFacet } = m.useModule(CommunityModule)
  const { erc20Mock } = m.useModule(ERC20Mock)

  return {
    diamond,
    groupFacet,
    communityInit,
    communityQueryFacet,
    erc20Mock,
  }
})
