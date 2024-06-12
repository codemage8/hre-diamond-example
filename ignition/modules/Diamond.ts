import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import { artifacts, ethers } from 'hardhat'
import { FacetCutAction, Selectors } from '~/scripts/diamond'
import DiamondBase from './DiamondBase'

export default buildModule('Diamond', (m) => {
  const { diamondCut, diamondLoupe, diamondInit, ownership } = m.useModule(DiamondBase)
  // Deploy Diamond
  const diamond = m.contract('Diamond', [m.getAccount(0), diamondCut])

  // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
  const cut = [diamondLoupe, ownership].map((f) => ({
    facetAddress: f,
    action: FacetCutAction.Add,
    functionSelectors: Selectors.fromArtifact(f.contractName).selectors,
  }))

  const iface = new ethers.Interface(artifacts.readArtifactSync('DiamondInit').abi)
  const initCall = iface.encodeFunctionData('init')

  const iDiamondCut = m.contractAt('IDiamondCut', diamond)
  m.call(iDiamondCut, 'diamondCut', [cut, diamondInit, initCall])

  return { diamond }
})
