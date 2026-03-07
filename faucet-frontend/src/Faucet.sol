// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TestnetFaucet {

    address public owner;
    uint256 public dripAmount;
    uint256 public cooldownTime;
    bool public paused;

    // Track last claim time per user
    mapping(address => uint256) public lastClaimed;

    // EVENTS
    event Claimed(address indexed user, uint256 amount);
    event DripAmountUpdated(uint256 newAmount);
    event CooldownUpdated(uint256 newCooldown);
    event FaucetPaused(bool status);
    event Withdrawn(uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier notPaused() {
        require(!paused, "Faucet is paused");
        _;
    }

    constructor(uint256 _dripAmount, uint256 _cooldownTime) {
        owner = msg.sender;
        dripAmount = _dripAmount;
        cooldownTime = _cooldownTime;
    }

    // USERS CLAIM TEST ETH
    function claim() external notPaused {
        require(
            block.timestamp >= lastClaimed[msg.sender] + cooldownTime,
            "Cooldown not finished"
        );

        require(
            address(this).balance >= dripAmount,
            "Faucet empty"
        );

        lastClaimed[msg.sender] = block.timestamp;

        payable(msg.sender).transfer(dripAmount);

        emit Claimed(msg.sender, dripAmount);
    }

    // OWNER CAN FUND CONTRACT
    receive() external payable {}

    // UPDATE DRIP AMOUNT
    function updateDripAmount(uint256 _newAmount) external onlyOwner {
        dripAmount = _newAmount;
        emit DripAmountUpdated(_newAmount);
    }

    // UPDATE COOLDOWN
    function updateCooldown(uint256 _newCooldown) external onlyOwner {
        cooldownTime = _newCooldown;
        emit CooldownUpdated(_newCooldown);
    }

    // PAUSE OR UNPAUSE
    function setPaused(bool _status) external onlyOwner {
        paused = _status;
        emit FaucetPaused(_status);
    }

    // OWNER WITHDRAW
    function withdraw(uint256 _amount) external onlyOwner {
        require(address(this).balance >= _amount, "Insufficient balance");

        payable(owner).transfer(_amount);

        emit Withdrawn(_amount);
    }

    // VIEW CONTRACT BALANCE
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
