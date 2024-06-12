import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'

describe('ReentrancyGuard', () => {
  const deployReentrancyGuard = async () => {
    const guard = await ethers.deployContract('ReentrancyMock')
    return { guard }
  }

  let ctx: Awaited<ReturnType<typeof deployReentrancyGuard>>
  beforeEach(async () => {
    ctx = await loadFixture(deployReentrancyGuard)
  })

  it('nonReentrant function can be called', async () => {
    expect(await ctx.guard.counter()).to.equal(0n)
    await ctx.guard.callback()
    expect(await ctx.guard.counter()).to.equal(1n)
  })

  it('does not allow remote callback', async () => {
    const attacker = await ethers.deployContract('ReentrancyAttack')
    await expect(ctx.guard.countAndCall(attacker)).to.be.revertedWith(
      'ReentrancyAttack: failed call'
    )
  })

  it('_reentrancyGuardEntered should be true when guarded', async () => {
    await ctx.guard.guardedCheckEntered()
  })

  it('_reentrancyGuardEntered should be false when unguarded', async () => {
    await ctx.guard.unguardedCheckNotEntered()
  })

  // The following are more side-effects than intended behavior:
  // I put them here as documentation, and to monitor any changes
  // in the side-effects.
  it('does not allow local recursion', async () => {
    await expect(ctx.guard.countLocalRecursive(10n)).to.be.revertedWithCustomError(
      ctx.guard,
      'ReentrancyGuardReentrantCall'
    )
  })

  it('does not allow indirect local recursion', async () => {
    await expect(ctx.guard.countThisRecursive(10n)).to.be.revertedWith(
      `ReentrancyMock: failed call`
    )
  })
})
