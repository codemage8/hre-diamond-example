// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

library LibReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 public constant NOT_ENTERED = 1;
    uint256 public constant ENTERED = 2;

    bytes32 public constant REENTRANCYGUARD_STORAGE_POSITION = keccak256("diamond.standard.reentrancyguard.storage");

    struct ReentrancyGuardStorage {
        uint256 status;
    }

    function reentrancyGuardStorage() internal pure returns (ReentrancyGuardStorage storage s) {
        bytes32 position = REENTRANCYGUARD_STORAGE_POSITION;
        // solhint-disable-next-line
        assembly {
            s.slot := position
        }
    }
}
