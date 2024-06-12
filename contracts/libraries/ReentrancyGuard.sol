// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {LibReentrancyGuard} from "./LibReentrancyGuard.sol";

abstract contract ReentrancyGuard {
    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        LibReentrancyGuard.ReentrancyGuardStorage storage s = LibReentrancyGuard.reentrancyGuardStorage();
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (s.status == LibReentrancyGuard.ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        s.status = LibReentrancyGuard.ENTERED;
    }

    function _nonReentrantAfter() private {
        LibReentrancyGuard.ReentrancyGuardStorage storage s = LibReentrancyGuard.reentrancyGuardStorage();
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        s.status = LibReentrancyGuard.NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        LibReentrancyGuard.ReentrancyGuardStorage storage s = LibReentrancyGuard.reentrancyGuardStorage();
        return s.status == LibReentrancyGuard.ENTERED;
    }
}
