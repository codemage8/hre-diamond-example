import '@nomicfoundation/hardhat-toolbox'
import '@nomiclabs/hardhat-solhint'
import { type HardhatUserConfig, vars } from 'hardhat/config'
import 'tsconfig-paths/register'

const infuraApiKey = vars.has('INFURA_API_KEY') ? vars.get('INFURA_API_KEY') : ''
const etherscanApiKey = vars.has('ETHERSCAN_API_KEY') ? vars.get('ETHERSCAN_API_KEY') : ''
const sepoliaAccounts = vars.has('SEPOLIA_PRIVATE_KEY') ? [vars.get('SEPOLIA_PRIVATE_KEY')] : []

const config: HardhatUserConfig = {
  solidity: '0.8.24',
  networks: {
    hardhat: {
      accounts: {
        // Enough accounts to test the group management
        count: 200,
      },
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${infuraApiKey}`,
      accounts: sepoliaAccounts,
    },
  },
  etherscan: {
    apiKey: etherscanApiKey,
  },
}

export default config
