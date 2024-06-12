import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('Community', (m) => {
  const communityQueryFacet = m.contract('CommunityQueryFacet')
  const groupFacet = m.contract('GroupFacet')
  const communityInit = m.contract('CommunityInit')
  return { communityInit, groupFacet, communityQueryFacet }
})
