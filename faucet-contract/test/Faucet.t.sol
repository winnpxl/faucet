// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Faucet.sol";

contract FaucetTest is Test {
    Faucet public faucet;
    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
    owner = address(this);
    user1 = makeAddr("user1");
    user2 = makeAddr("user2");

    // Start at a realistic timestamp so cooldown math works
    vm.warp(1_700_000_000);

    faucet = new Faucet();

    // Fund the faucet with 1 ETH
    vm.deal(address(faucet), 1 ether);
}

    // ─── Deployment ───────────────────────────────────────────
    function test_InitialState() public view {
        assertEq(faucet.owner(), owner);
        assertEq(faucet.dripAmount(), 0.01 ether);
        assertEq(faucet.cooldown(), 1 minutes);
        assertEq(faucet.getBalance(), 1 ether);
    }

    // ─── Claiming ─────────────────────────────────────────────
    function test_UserCanClaim() public {
        vm.prank(user1);
        faucet.claim();

        assertEq(user1.balance, 0.01 ether);
        assertEq(faucet.getBalance(), 0.99 ether);
    }

    function test_EmitsClaimedEvent() public {
        vm.expectEmit(true, false, false, true);
        emit Faucet.Claimed(user1, 0.01 ether);

        vm.prank(user1);
        faucet.claim();
    }

    function test_CooldownPreventsDoubleClaim() public {
        vm.prank(user1);
        faucet.claim();

        vm.prank(user1);
        vm.expectRevert("Cooldown active: please wait");
        faucet.claim();
    }

    function test_UserCanClaimAfterCooldown() public {
        vm.prank(user1);
        faucet.claim();

        // Fast forward time by 1 minute
        vm.warp(block.timestamp + 1 minutes);

        vm.prank(user1);
        faucet.claim();

        assertEq(user1.balance, 0.02 ether);
    }

    function test_MultipleUsersCanClaim() public {
        vm.prank(user1);
        faucet.claim();

        vm.prank(user2);
        faucet.claim();

        assertEq(user1.balance, 0.01 ether);
        assertEq(user2.balance, 0.01 ether);
    }

    function test_RevertWhenFaucetEmpty() public {
        // Drain the faucet
        vm.deal(address(faucet), 0.005 ether);

        vm.prank(user1);
        vm.expectRevert("Faucet is empty");
        faucet.claim();
    }

    // ─── Time until next claim ────────────────────────────────
    function test_TimeUntilNextClaim_BeforeClaim() public view {
        assertEq(faucet.getTimeUntilNextClaim(user1), 0);
    }

    function test_TimeUntilNextClaim_AfterClaim() public {
        vm.prank(user1);
        faucet.claim();

        uint256 timeLeft = faucet.getTimeUntilNextClaim(user1);
        assertApproxEqAbs(timeLeft, 60, 1);
    }

    // ─── Owner functions ──────────────────────────────────────
    function test_OwnerCanSetDripAmount() public {
        faucet.setDripAmount(0.05 ether);
        assertEq(faucet.dripAmount(), 0.05 ether);
    }

    function test_NonOwnerCannotSetDripAmount() public {
        vm.prank(user1);
        vm.expectRevert("Not the owner");
        faucet.setDripAmount(0.05 ether);
    }

    function test_OwnerCanSetCooldown() public {
        faucet.setCooldown(5 minutes);
        assertEq(faucet.cooldown(), 5 minutes);
    }

    function test_NonOwnerCannotSetCooldown() public {
        vm.prank(user1);
        vm.expectRevert("Not the owner");
        faucet.setCooldown(5 minutes);
    }

    function test_OwnerCanWithdraw() public {
        uint256 balanceBefore = owner.balance;
        faucet.withdraw();
        assertEq(owner.balance, balanceBefore + 1 ether);
        assertEq(faucet.getBalance(), 0);
    }

    function test_NonOwnerCannotWithdraw() public {
        vm.prank(user1);
        vm.expectRevert("Not the owner");
        faucet.withdraw();
    }

    // ─── Funding ──────────────────────────────────────────────
    function test_FaucetCanReceiveETH() public {
        vm.deal(user1, 1 ether);
        vm.prank(user1);
        (bool success, ) = address(faucet).call{value: 0.5 ether}("");
        assertTrue(success);
        assertEq(faucet.getBalance(), 1.5 ether);
    }

    receive() external payable {}
}