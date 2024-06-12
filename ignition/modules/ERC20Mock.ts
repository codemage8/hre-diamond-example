import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import { ethers } from 'hardhat'

export default buildModule('ERC20Mock', (m) => {
  // Deploy DiamondCutFacet
  const erc20Mock = m.contract('ERC20Mock', [ethers.parseEther('1000000000')])
  return { erc20Mock }
})
