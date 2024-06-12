import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('AccessControl', (m) => {
  const accessControlInit = m.contract('AccessControlInit')

  const accessControlFacet = m.contract('AccessControlFacet')

  return { accessControlInit, accessControlFacet }
})
