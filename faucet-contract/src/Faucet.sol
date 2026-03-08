// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Faucet {
    // ─── State ───────────────────────────────────────────────
    address public owner;
    uint256 public cooldown = 1 minutes;
    uint256 public dripAmount = 0.01 ether;

    mapping(address => uint256) public lastClaim;

    // ─── Events ──────────────────────────────────────────────
    event Claimed(address indexed user, uint256 amount);
    event FaucetFunded(address indexed funder, uint256 amount);
    event DripAmountUpdated(uint256 newAmount);
    event CooldownUpdated(uint256 newCooldown);
    event Withdrawn(address indexed owner, uint256 amount);

    // ─── Modifiers ───────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    // ─── Constructor ─────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }

    // ─── Core ────────────────────────────────────────────────
    function claim() external {
        require(
            block.timestamp - lastClaim[msg.sender] >= cooldown,
            "Cooldown active: please wait"
        );
        require(
            address(this).balance >= dripAmount,
            "Faucet is empty"
        );

        lastClaim[msg.sender] = block.timestamp;

        (bool success, ) = payable(msg.sender).call{value: dripAmount}("");
        require(success, "Transfer failed");

        emit Claimed(msg.sender, dripAmount);
    }

    // ─── Owner functions ─────────────────────────────────────
    function setDripAmount(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount must be greater than 0");
        dripAmount = _amount;
        emit DripAmountUpdated(_amount);
    }

    function setCooldown(uint256 _seconds) external onlyOwner {
        cooldown = _seconds;
        emit CooldownUpdated(_seconds);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Nothing to withdraw");

        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Withdraw failed");

        emit Withdrawn(owner, balance);
    }

    // ─── View ─────────────────────────────────────────────────
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getTimeUntilNextClaim(address user) external view returns (uint256) {
        uint256 last = lastClaim[user];
        if (block.timestamp - last >= cooldown) return 0;
        return cooldown - (block.timestamp - last);
    }

    // ─── Receive ETH ─────────────────────────────────────────
    receive() external payable {
        emit FaucetFunded(msg.sender, msg.value);
    }
}