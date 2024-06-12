import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('DiamondBase', (m) => {
  // Deploy DiamondCutFacet
  const diamondCut = m.contract('DiamondCutFacet')
  const diamondInit = m.contract('DiamondInit')
  const diamondLoupe = m.contract('DiamondLoupeFacet')
  const ownership = m.contract('OwnershipFacet')

  return { diamondCut, diamondInit, diamondLoupe, ownership }
})
