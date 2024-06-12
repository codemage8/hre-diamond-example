// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {AppStorage, LibAppStorage} from "../libraries/LibAppStorage.sol";

contract CommunityInit {
    enum ErrorCode {
        InvalidSecretary,
        InvalidPaymentToken
    }

    error CommunityInitError(ErrorCode code);

    struct InitParams {
        address secretary;
        address token;
    }

    // You can add parameters to this function in order to pass in
    // data to set your own state variables
    function init(InitParams memory _params) external {
        AppStorage storage s = LibAppStorage.appStorage();
        if (_params.secretary == address(0)) {
            revert CommunityInitError(ErrorCode.InvalidSecretary);
        }
        if (_params.token == address(0)) {
            revert CommunityInitError(ErrorCode.InvalidPaymentToken);
        }
        s.secretary = _params.secretary;
        s.token = _params.token;
        s.nextGroupId = 1;
    }
}
