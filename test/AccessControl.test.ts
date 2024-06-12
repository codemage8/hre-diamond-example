/* eslint-disable @typescript-eslint/no-unused-expressions */
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers, ignition } from 'hardhat'
import AccessControl from '~/ignition/modules/AccessControl'
import Diamond from '~/ignition/modules/Diamond'
import { FacetCutAction, executeDiamondCut } from '~/scripts/diamond'

const ROLE_DEFAULT_ADMIN = ethers.ZeroHash
const ROLE = ethers.id('ROLE')

describe('AccessControl', () => {
  const deployAccessControl = async () => {
    const { diamond } = await ignition.deploy(Diamond)
    const { accessControlInit, accessControlFacet } = await ignition.deploy(AccessControl)

    // call diamond cut
    await executeDiamondCut({
      diamond,
      facets: [accessControlFacet],
      action: FacetCutAction.Add,
      cutInitParams: {
        address: await accessControlInit.getAddress(),
        callData: accessControlInit.interface.encodeFunctionData('init'),
      },
    })

    const diamondAddress = await diamond.getAddress()
    const accessControl = await ethers.getContractAt('IAccessControl', diamondAddress)
    const diamondLoupe = await ethers.getContractAt('IDiamondLoupe', diamondAddress)

    const [defaultAdmin, authorized, other, otherAdmin, ...accounts] = await ethers.getSigners()
    return {
      diamond,
      diamondAddress,
      accessControl,
      diamondLoupe,
      defaultAdmin,
      accounts,
      authorized,
      other,
      otherAdmin,
    }
  }

  let ctx: Awaited<ReturnType<typeof deployAccessControl>>
  beforeEach(async () => {
    ctx = await loadFixture(deployAccessControl)
  })

  describe('default admin', () => {
    it('deployer has default admin role', async () => {
      const { accessControl, defaultAdmin } = ctx
      expect(await accessControl.hasRole(ROLE_DEFAULT_ADMIN, defaultAdmin)).to.be.true
    })

    it("other role's admin is the default admin role", async () => {
      const { accessControl } = ctx
      expect(await accessControl.getRoleAdmin(ROLE)).to.equal(ROLE_DEFAULT_ADMIN)
    })

    it("default admin role's admin is itself", async () => {
      const { accessControl } = ctx
      expect(await accessControl.getRoleAdmin(ROLE_DEFAULT_ADMIN)).to.equal(ROLE_DEFAULT_ADMIN)
    })
  })

  describe('granting', () => {
    beforeEach(async () => {
      const { accessControl, defaultAdmin, authorized } = ctx
      await accessControl.connect(defaultAdmin).grantRole(ROLE, authorized)
    })

    it('non-admin cannot grant role to other accounts', async function () {
      const { accessControl, authorized, other } = ctx
      await expect(accessControl.connect(other).grantRole(ROLE, authorized))
        .to.be.revertedWithCustomError(accessControl, 'AccessControlUnauthorizedAccount')
        .withArgs(other, ROLE_DEFAULT_ADMIN)
    })

    it('accounts can be granted a role multiple times', async function () {
      const { accessControl, defaultAdmin, authorized } = ctx
      await accessControl.connect(defaultAdmin).grantRole(ROLE, authorized)
      await expect(accessControl.connect(defaultAdmin).grantRole(ROLE, authorized)).to.not.emit(
        accessControl,
        'RoleGranted'
      )
    })
  })

  describe('revoking', () => {
    it('roles that are not had can be revoked', async function () {
      const { accessControl, authorized, defaultAdmin } = ctx
      expect(await accessControl.hasRole(ROLE, authorized)).to.be.false

      await expect(accessControl.connect(defaultAdmin).revokeRole(ROLE, authorized)).to.not.emit(
        accessControl,
        'RoleRevoked'
      )
    })

    describe('with granted role', function () {
      beforeEach(async function () {
        const { accessControl, authorized, defaultAdmin } = ctx
        await accessControl.connect(defaultAdmin).grantRole(ROLE, authorized)
      })

      it('admin can revoke role', async function () {
        const { accessControl, authorized, defaultAdmin } = ctx
        await expect(accessControl.connect(defaultAdmin).revokeRole(ROLE, authorized))
          .to.emit(accessControl, 'RoleRevoked')
          .withArgs(ROLE, authorized, defaultAdmin)

        expect(await accessControl.hasRole(ROLE, authorized)).to.be.false
      })

      it('non-admin cannot revoke role', async function () {
        const { accessControl, other, authorized } = ctx
        await expect(accessControl.connect(other).revokeRole(ROLE, authorized))
          .to.be.revertedWithCustomError(accessControl, 'AccessControlUnauthorizedAccount')
          .withArgs(other, ROLE_DEFAULT_ADMIN)
      })

      it('a role can be revoked multiple times', async function () {
        const { accessControl, defaultAdmin, authorized } = ctx
        await accessControl.connect(defaultAdmin).revokeRole(ROLE, authorized)

        await expect(accessControl.connect(defaultAdmin).revokeRole(ROLE, authorized)).to.not.emit(
          accessControl,
          'RoleRevoked'
        )
      })
    })
  })

  describe('renouncing', () => {
    it('roles that are not had can be renounced', async () => {
      const { accessControl, authorized } = ctx
      await expect(accessControl.connect(authorized).renounceRole(ROLE, authorized)).to.not.emit(
        accessControl,
        'RoleRevoked'
      )
    })

    describe('with granted role', () => {
      beforeEach(async () => {
        const { accessControl, authorized, defaultAdmin } = ctx
        await accessControl.connect(defaultAdmin).grantRole(ROLE, authorized)
      })

      it('bearer can renounce role', async () => {
        const { accessControl, authorized } = ctx
        await expect(accessControl.connect(authorized).renounceRole(ROLE, authorized))
          .to.emit(accessControl, 'RoleRevoked')
          .withArgs(ROLE, authorized, authorized)

        expect(await accessControl.hasRole(ROLE, authorized)).to.be.false
      })

      it('only the sender can renounce their roles', async function () {
        const { accessControl, authorized, defaultAdmin } = ctx
        await expect(
          accessControl.connect(defaultAdmin).renounceRole(ROLE, authorized)
        ).to.be.revertedWithCustomError(accessControl, 'AccessControlBadConfirmation')
      })

      it('a role can be renounced multiple times', async function () {
        const { accessControl, authorized } = ctx
        await accessControl.connect(authorized).renounceRole(ROLE, authorized)
        await expect(accessControl.connect(authorized).renounceRole(ROLE, authorized)).not.to.emit(
          accessControl,
          'RoleRevoked'
        )
      })
    })
  })
})
