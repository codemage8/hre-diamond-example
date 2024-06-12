import { assert } from 'chai'
import type { ContractTransactionReceipt, ContractTransactionResponse } from 'ethers'
import { ethers, ignition } from 'hardhat'
import DiamondModule from '~/ignition/modules/Diamond'
import { FacetCutAction, Selectors, deployArtifact } from '~/scripts/diamond'
import type { Test2Facet } from '~/typechain-types'
import {
  type DiamondCutFacet,
  type DiamondLoupeFacet,
  type OwnershipFacet,
  type Test1Facet,
} from '~/typechain-types'

describe('DiamondTest', () => {
  let diamondAddress: string
  let diamondCutFacet: DiamondCutFacet
  let diamondLoupeFacet: DiamondLoupeFacet
  let ownershipFacet: OwnershipFacet
  let tx: ContractTransactionResponse
  let receipt: ContractTransactionReceipt | null
  const addresses: string[] = []

  const findAddressPositionInFacets = (
    facetAddress: string,
    facets: { facetAddress: string; functionSelectors: string[] }[]
  ): number => {
    for (let i = 0; i < facets.length; i++) {
      if (facets[i].facetAddress === facetAddress) {
        return i
      }
    }

    throw new Error('None number found')
  }

  before(async () => {
    const { diamond } = await ignition.deploy(DiamondModule)
    diamondAddress = await diamond.getAddress()
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)
    diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress)
    ownershipFacet = await ethers.getContractAt('OwnershipFacet', diamondAddress)
  })

  it('should have three facets -- call to facetAddresses function', async () => {
    addresses.push(...(await diamondLoupeFacet.facetAddresses()))
    assert.equal(addresses.length, 3)
  })

  it('facets should have the right function selectors -- call to facetFunctionSelectors function', async () => {
    let result = await diamondLoupeFacet.facetFunctionSelectors(addresses[0])
    assert.sameMembers([...result], Selectors.fromContract(diamondCutFacet).selectors)

    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[1])
    assert.sameMembers([...result], Selectors.fromContract(diamondLoupeFacet).selectors)

    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[2])
    assert.sameMembers([...result], Selectors.fromContract(ownershipFacet).selectors)
  })

  it('selectors should be associated to facets correctly -- multiple calls to facetAddress function', async () => {
    assert.equal(addresses[0], await diamondLoupeFacet.facetAddress('0x1f931c1c'))
    assert.equal(addresses[1], await diamondLoupeFacet.facetAddress('0xcdffacc6'))
    assert.equal(addresses[1], await diamondLoupeFacet.facetAddress('0x01ffc9a7'))
    assert.equal(addresses[2], await diamondLoupeFacet.facetAddress('0xf2fde38b'))
  })

  it('should add test1 functions', async () => {
    const test1Facet = await deployArtifact<Test1Facet>('Test1Facet')
    addresses.push(await test1Facet.getAddress())
    const selectors = Selectors.fromContract(test1Facet).removed([
      'supportsInterface(bytes4)',
    ]).selectors
    const tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: await test1Facet.getAddress(),
          action: FacetCutAction.Add,
          functionSelectors: selectors,
        },
      ],
      ethers.ZeroAddress,
      '0x',
      { gasLimit: 800000 }
    )
    const receipt = await tx.wait()
    if (!receipt?.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    const result = await diamondLoupeFacet.facetFunctionSelectors(await test1Facet.getAddress())
    assert.sameMembers([...result], selectors)
  })

  it('should test function call', async () => {
    const test1Facet = await ethers.getContractAt('Test1Facet', diamondAddress)
    await test1Facet.test1Func10()
  })

  it('should replace supportsInterface function', async () => {
    const Test1Facet = await ethers.getContractFactory('Test1Facet')
    const selectors = Selectors.fromContract(Test1Facet).extracted([
      'supportsInterface(bytes4)',
    ]).selectors
    const testFacetAddress = addresses[3]
    tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: testFacetAddress,
          action: FacetCutAction.Replace,
          functionSelectors: selectors,
        },
      ],
      ethers.ZeroAddress,
      '0x',
      { gasLimit: 800000 }
    )
    receipt = await tx.wait()
    if (!receipt?.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    const result = await diamondLoupeFacet.facetFunctionSelectors(testFacetAddress)
    assert.sameMembers([...result], Selectors.fromContract(Test1Facet).selectors)
  })

  it('should add test2 functions', async () => {
    const test2Facet = await deployArtifact<Test2Facet>('Test2Facet')
    addresses.push(await test2Facet.getAddress())
    const selectors = Selectors.fromContract(test2Facet).selectors
    tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: test2Facet,
          action: FacetCutAction.Add,
          functionSelectors: selectors,
        },
      ],
      ethers.ZeroAddress,
      '0x',
      { gasLimit: 800000 }
    )
    const receipt = await tx.wait()
    if (!receipt?.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    const result = await diamondLoupeFacet.facetFunctionSelectors(test2Facet)
    assert.sameMembers([...result], selectors)
  })

  it('should remove some test2 functions', async () => {
    const test2Facet = await ethers.getContractAt('Test2Facet', diamondAddress)
    const functionsToKeep = [
      'test2Func1()',
      'test2Func5()',
      'test2Func6()',
      'test2Func19()',
      'test2Func20()',
    ]
    const selectors = Selectors.fromContract(test2Facet).removed(functionsToKeep).selectors
    tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: ethers.ZeroAddress,
          action: FacetCutAction.Remove,
          functionSelectors: selectors,
        },
      ],
      ethers.ZeroAddress,
      '0x',
      { gasLimit: 800000 }
    )
    const receipt = await tx.wait()
    if (!receipt?.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    const result = await diamondLoupeFacet.facetFunctionSelectors(addresses[4])
    assert.sameMembers(
      [...result],
      Selectors.fromContract(test2Facet).extracted(functionsToKeep).selectors
    )
  })

  it('should remove some test1 functions', async () => {
    const test1Facet = await ethers.getContractAt('Test1Facet', diamondAddress)
    const functionsToKeep = ['test1Func2()', 'test1Func11()', 'test1Func12()']
    const selectors = Selectors.fromContract(test1Facet).removed(functionsToKeep).selectors
    tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: ethers.ZeroAddress,
          action: FacetCutAction.Remove,
          functionSelectors: selectors,
        },
      ],
      ethers.ZeroAddress,
      '0x',
      { gasLimit: 800000 }
    )
    const receipt = await tx.wait()
    if (!receipt?.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    const result = await diamondLoupeFacet.facetFunctionSelectors(addresses[3])
    assert.sameMembers(
      [...result],
      Selectors.fromContract(test1Facet).extracted(functionsToKeep).selectors
    )
  })

  it("remove all functions and facets except 'diamondCut' and 'facets'", async () => {
    let facets = await diamondLoupeFacet.facets()
    let selectors = [...facets.flatMap((f) => [...f.functionSelectors])]
    const toKeep = ['facets()', 'diamondCut(tuple(address,uint8,bytes4[])[],address,bytes)']
    const iface = new ethers.Interface(toKeep.map((v) => `function ${v}`))
    selectors = selectors.filter(
      (selector) => !toKeep.some((v) => iface.getFunction(v)?.selector === selector)
    )
    tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: ethers.ZeroAddress,
          action: FacetCutAction.Remove,
          functionSelectors: selectors,
        },
      ],
      ethers.ZeroAddress,
      '0x',
      { gasLimit: 800000 }
    )
    const receipt = await tx.wait()
    if (!receipt?.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    facets = await diamondLoupeFacet.facets()
    assert.equal(facets.length, 2)
    assert.equal(facets[0][0], addresses[0])
    assert.sameMembers([...facets[0][1]], ['0x1f931c1c'])
    assert.equal(facets[1][0], addresses[1])
    assert.sameMembers([...facets[1][1]], ['0x7a0ed627'])
  })

  it('add most functions and facets', async () => {
    const diamondLoupeFacetSelectors = Selectors.fromContract(diamondLoupeFacet).removed([
      'supportsInterface(bytes4)',
    ])
    const Test1Facet = await ethers.getContractFactory('Test1Facet')
    const Test2Facet = await ethers.getContractFactory('Test2Facet')
    // Any number of functions from any number of facets can be added/replaced/removed in a
    // single transaction
    const cut = [
      {
        facetAddress: addresses[1],
        action: FacetCutAction.Add,
        functionSelectors: diamondLoupeFacetSelectors.removed(['facets()']).selectors,
      },
      {
        facetAddress: addresses[2],
        action: FacetCutAction.Add,
        functionSelectors: Selectors.fromContract(ownershipFacet).selectors,
      },
      {
        facetAddress: addresses[3],
        action: FacetCutAction.Add,
        functionSelectors: Selectors.fromContract(Test1Facet).selectors,
      },
      {
        facetAddress: addresses[4],
        action: FacetCutAction.Add,
        functionSelectors: Selectors.fromContract(Test2Facet).selectors,
      },
    ]
    tx = await diamondCutFacet.diamondCut(cut, ethers.ZeroAddress, '0x', {
      gasLimit: 8000000,
    })
    const receipt = await tx.wait()
    if (!receipt?.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    const facets = await diamondLoupeFacet.facets()
    const facetAddresses = await diamondLoupeFacet.facetAddresses()
    assert.equal(facetAddresses.length, 5)
    assert.equal(facets.length, 5)
    assert.sameMembers([...facetAddresses], addresses)
    assert.equal(facets[0][0], facetAddresses[0], 'first facet')
    assert.equal(facets[1][0], facetAddresses[1], 'second facet')
    assert.equal(facets[2][0], facetAddresses[2], 'third facet')
    assert.equal(facets[3][0], facetAddresses[3], 'fourth facet')
    assert.equal(facets[4][0], facetAddresses[4], 'fifth facet')
    assert.sameMembers(
      [...facets[findAddressPositionInFacets(addresses[0], facets)][1]],
      Selectors.fromContract(diamondCutFacet).selectors
    )
    assert.sameMembers(
      [...facets[findAddressPositionInFacets(addresses[1], facets)][1]],
      diamondLoupeFacetSelectors.selectors
    )
    assert.sameMembers(
      [...facets[findAddressPositionInFacets(addresses[2], facets)][1]],
      Selectors.fromContract(ownershipFacet).selectors
    )
    assert.sameMembers(
      [...facets[findAddressPositionInFacets(addresses[3], facets)][1]],
      Selectors.fromContract(Test1Facet).selectors
    )
    assert.sameMembers(
      [...facets[findAddressPositionInFacets(addresses[4], facets)][1]],
      Selectors.fromContract(Test2Facet).selectors
    )
  })
})
