import type {
  AddressLike,
  BaseContract,
  BytesLike,
  ContractFactory,
  FunctionFragment,
  Interface,
} from 'ethers'
import { artifacts, ethers } from 'hardhat'

export enum FacetCutAction {
  Add = 0,
  Replace,
  Remove,
}

export class Selectors {
  constructor(
    public readonly selectors: string[],
    private readonly iface: Interface
  ) {}

  static fromInterface(iface: Interface): Selectors {
    const selectors = iface.fragments
      .filter(
        (fragment): fragment is FunctionFragment =>
          fragment.type === 'function' && fragment.format('sighash') !== 'init(bytes)'
      )
      .map((fragment) => fragment.selector)
    return new Selectors(selectors, iface)
  }

  static fromArtifact(contractName: string): Selectors {
    return Selectors.fromInterface(
      new ethers.Interface(artifacts.readArtifactSync(contractName).abi)
    )
  }

  static fromContract(contract: BaseContract | ContractFactory) {
    return Selectors.fromInterface(contract.interface)
  }

  extracted = (functionNames: string[]): Selectors => {
    const selectors = this.selectors.filter((selector) =>
      functionNames.some((name) => this.iface.getFunction(name)?.selector === selector)
    )
    return new Selectors(selectors, this.iface)
  }

  removed = (functionNames: string[]): Selectors => {
    const selectors = this.selectors.filter(
      (selector) =>
        !functionNames.some((name) => this.iface.getFunction(name)?.selector === selector)
    )
    return new Selectors(selectors, this.iface)
  }

  get signatures(): string[] {
    return this.iface.fragments
      .filter(
        (fragment): fragment is FunctionFragment =>
          fragment.type === 'function' && fragment.format('sighash') !== 'init(bytes)'
      )
      .map((f) => f.format('sighash'))
  }
}

export const deployArtifact = async <T extends BaseContract>(name: string) => {
  const Contract = await ethers.getContractFactory(name)
  const contract = await Contract.deploy()
  await contract.waitForDeployment()
  return contract as unknown as T
}

type Address = Exclude<AddressLike, Promise<string>>

interface DiamondCutInitParams {
  address: AddressLike
  callData: BytesLike
}

export interface DiamondCutElement {
  facetAddress: AddressLike
  action: FacetCutAction
  functionSelectors: BytesLike[]
}

export interface DiamondCutParams {
  diamond: Address
  facets: BaseContract[]
  action: FacetCutAction
  cutInitParams?: DiamondCutInitParams
  from?: string
}

/**
 * Useful utility to add facet to the diamond
 * @param param0 AddFacetParams
 */
export const executeDiamondCut = async ({
  diamond,
  action,
  facets,
  cutInitParams,
  from,
}: DiamondCutParams) => {
  const diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamond)
  const cut: DiamondCutElement[] = []
  for (let facet of facets) {
    cut.push({
      facetAddress: action === FacetCutAction.Remove ? ethers.ZeroAddress : facet,
      action,
      functionSelectors: Selectors.fromContract(facet).selectors,
    })
  }

  const [initAddress, initCallData] = cutInitParams
    ? [cutInitParams.address, cutInitParams.callData]
    : [ethers.ZeroAddress, '0x']

  const gas = await diamondCutFacet.diamondCut.estimateGas(cut, initAddress, initCallData, { from })
  await diamondCutFacet.diamondCut(cut, initAddress, initCallData, {
    gasLimit: BigInt(Math.ceil(Number(gas) * 1.5)),
  })
}
