// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Faucet {

    uint256 public cooldown = 1 minutes;
    uint256 public dripAmount = 0.01 ether;

    mapping(address => uint256) public lastClaim;

    function claim() public {
        require(
            block.timestamp - lastClaim[msg.sender] >= cooldown,
            "Wait before claiming again"
        );

        lastClaim[msg.sender] = block.timestamp;

        payable(msg.sender).transfer(dripAmount);
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {}
}
