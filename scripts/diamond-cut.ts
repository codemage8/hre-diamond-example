/* eslint-disable no-console */
import { checkbox, input, select } from '@inquirer/prompts'
import { readFile, readdir } from 'fs/promises'
import { ethers } from 'hardhat'
import path from 'path'
import { executeDiamondCut } from './diamond'
import { executeScript } from './util'

const excludedFacets = [
  'OwnershipFacet',
  'AccessControlFacet',
  'OwnershipFacet',
  'DiamondCutFacet',
  'DiamondLoupeFacet',
  'DiamondInit',
  'AccessControlInit',
]

const main = async () => {
  const dirContents = await readdir(path.join(__dirname, '../ignition/deployments'), {
    withFileTypes: true,
  })
  const deployments = dirContents
    .filter((dir) => dir.isDirectory() && dir.name !== 'chain-31337')
    .map((dir) => ({ name: dir.name, value: dir.name }))
  // 1. Read Deployed Directory
  const deployDirectory = await select({
    message: 'Select Ignition Deployment',
    choices: deployments,
  })

  // Grab all the addresses.
  const deployedFilePath = path.join(
    __dirname,
    `../ignition/deployments/${deployDirectory}/deployed_addresses.json`
  )
  const addresses = JSON.parse(await readFile(deployedFilePath, 'utf8'))

  const availableFacets = Object.keys(addresses)
    .filter((k) => excludedFacets.every((ef) => !k.endsWith(`#${ef}`)) && k.endsWith('Facet'))
    .map((name) => ({ name, value: name }))

  if (!availableFacets.length) {
    console.info('No facets available for the deployment')
    return
  }

  const diamondAddress = addresses['Diamond#Diamond']

  // 2. Pick Facets
  const selectedFacets = await checkbox({
    message: 'Select Facets',
    choices: availableFacets,
    required: true,
  })

  const action = await select({
    message: 'Select Action',
    choices: [
      {
        name: 'Add',
        value: 0,
      },
      {
        name: 'Replace',
        value: 1,
      },
      {
        name: 'Remove',
        value: 2,
      },
    ],
  })

  const inits = Object.keys(addresses).filter(
    (k) => !excludedFacets.includes(k.split('#')[1]) && (k.endsWith('Init') || k.endsWith('Facet'))
  )

  const initAddress = await select({
    message: 'Select initialization contract',
    choices: [
      { name: 'None', value: ethers.ZeroAddress },
      ...inits.map((name) => ({ name, value: addresses[name] })),
    ],
  })
  let initData = '0x'
  if (initAddress !== ethers.ZeroAddress) {
    initData = await input({
      message: 'Encoded init call data',
    })
  }

  const facets = Promise.all(
    selectedFacets.map((facetName) =>
      ethers.getContractAt(facetName.split('#')[1], addresses[facetName])
    )
  )

  await executeDiamondCut({
    diamond: diamondAddress,
    action,
    facets: await facets,
    cutInitParams: {
      address: initAddress,
      callData: initData,
    },
  })
}

if (require.main === module) executeScript(main)
