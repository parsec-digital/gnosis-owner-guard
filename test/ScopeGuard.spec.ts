import { expect } from "chai";
import hre, { deployments, waffle, ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { AddressZero } from "@ethersproject/constants";

describe("OwnerGuard", async () => {
  const [user1, user2] = waffle.provider.getWallets();
  const abiCoder = new ethers.utils.AbiCoder();
  const initializeParams = abiCoder.encode(["address"], [user1.address]);

  const setupTests = deployments.createFixture(async ({ deployments }) => {
    await deployments.fixture();
    const avatarFactory = await hre.ethers.getContractFactory("TestAvatar");
    const avatar = await avatarFactory.deploy();
    const guardFactory = await hre.ethers.getContractFactory("OwnerGuard");
    const guard = await guardFactory.deploy(user1.address);
    await avatar.enableModule(user1.address);
    await avatar.setGuard(guard.address);
    const tx = {
      to: avatar.address,
      value: 0,
      data: "0x",
      operation: 0,
      avatarTxGas: 0,
      baseGas: 0,
      gasPrice: 0,
      gasToken: AddressZero,
      refundReceiver: AddressZero,
      signatures: "0x",
    };
    return {
      avatar,
      guard,
      tx,
    };
  });

  describe("setUp()", async () => {
    it("throws if guard has already been initialized", async () => {
      const { guard } = await setupTests();
      await expect(guard.setUp(initializeParams)).to.be.revertedWith(
        "Initializable: contract is already initialized"
      );
    });

    it("throws if owner is zero address", async () => {
      const Guard = await hre.ethers.getContractFactory("OwnerGuard");
      await expect(Guard.deploy(AddressZero)).to.be.revertedWith(
        "Ownable: new owner is the zero address"
      );
    });

    it("should emit event because of successful set up", async () => {
      const Guard = await hre.ethers.getContractFactory("OwnerGuard");
      const guard = await Guard.deploy(user1.address);
      await guard.deployed();

      await expect(guard.deployTransaction)
        .to.emit(guard, "OwnerGuardSetup")
        .withArgs(user1.address, user1.address);
    });
  });

  describe("fallback", async () => {
    it("must NOT revert on fallback without value", async () => {
      const { guard } = await setupTests();
      await user1.sendTransaction({
        to: guard.address,
        data: "0xbaddad",
      });
    });
    it("should revert on fallback with value", async () => {
      const { guard } = await setupTests();
      await expect(
        user1.sendTransaction({
          to: guard.address,
          data: "0xbaddad",
          value: 1,
        })
      ).to.be.reverted;
    });
  });

  describe("transferOwnership()", async () => {
    it("should transfer ownership", async () => {
      const { guard, tx } = await setupTests();
      await expect(await guard.owner()).equal(user1.address)
      await guard.transferOwnership(user2.address)
      await expect(await guard.owner()).equal(user2.address)
    })
  })

  describe("checkTransaction()", async () => {
    it("should revert if account is bricked", async () => {
      const { guard, tx } = await setupTests();
      guard.setAccountBricked(user2.address, true)
      await expect(
        guard.checkTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.avatarTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.signatures,
          user2.address
        )
      ).to.be.revertedWith("Account has been bricked, and cannot perform transactions");
    });

    it("should NOT revert if account is not bricked", async () => {
      const { guard, tx } = await setupTests();
      await expect(
        guard.checkTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.avatarTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.signatures,
          user2.address
        )
      );
    });

    it("should send ETH to target if account is allowed", async () => {
      const { avatar, guard, tx } = await setupTests();
      tx.data = "0x12345678";
      tx.value = 1;
      expect(
        await guard.checkTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.avatarTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.signatures,
          user2.address
        )
      );
    });

    it("should NOT send ETH to target if account is allowed", async () => {
      const { avatar, guard, tx } = await setupTests();
      guard.setAccountBricked(user2.address, true)
      tx.data = "0x12345678";
      tx.value = 1;
      await expect(
        guard.checkTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.avatarTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.signatures,
          user2.address
        )
      ).to.be.revertedWith("Account has been bricked, and cannot perform transactions");
    });

    it("should be callable by an avatar", async () => {
      const { avatar, guard, tx } = await setupTests();
      tx.operation = 0;
      tx.to = guard.address;
      tx.value = 0;
      await expect(
        avatar.execTransaction(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.avatarTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.signatures
        )
      );
    });
  });

  describe("setAccountBricked()", async () => {
    it("should revert if caller is not owner", async () => {
      const { guard } = await setupTests();
      expect(
        guard.connect(user2).setAccountBricked(user2.address, true)
      ).to.be.revertedWith("caller is not the owner");
    });

    it("should brick an account", async () => {
      const { avatar, guard } = await setupTests();
      expect(await guard.isAccountBricked(user2.address)).to.be.equals(false);
      expect(guard.setAccountBricked(user2.address, true))
        .to.emit(guard, "SetAccountBricked")
        .withArgs(user2.address, true);
      await expect(await guard.isAccountBricked(user2.address)).to.be.equals(
        true
      );
    });

    it("should not brick the owner", async () => {
      const { guard } = await setupTests();
      await expect(await guard.owner()).equal(user1.address)
      await expect(
        guard.setAccountBricked(user1.address, true)
      ).to.be.revertedWith("Cannot brick the owner acount");
    });

    it("should not brick the guard", async () => {
      const { guard } = await setupTests();
      await expect(
        guard.setAccountBricked(guard.address, true)
      ).to.be.revertedWith("Cannot brick the guard account");
    });

    it("should brick and unbrick an account", async () => {
      const { avatar, guard } = await setupTests();
      expect(await guard.isAccountBricked(user2.address)).to.be.equals(false);
      expect(guard.setAccountBricked(user2.address, true))
        .to.emit(guard, "SetAccountBricked")
        .withArgs(user2.address, true);
      expect(await guard.isAccountBricked(user2.address)).to.be.equals(true);
      expect(guard.setAccountBricked(user2.address, false))
        .to.emit(guard, "SetAccountBricked")
        .withArgs(user2.address, false);
        expect(await guard.isAccountBricked(user2.address)).to.be.equals(false);
    });

    it("should emit SetAccountBricked(account, bricked)", async () => {
      const { avatar, guard } = await setupTests();
      expect(guard.setAccountBricked(user2.address, true))
        .to.emit(guard, "SetAccountBricked")
        .withArgs(user2.address, true);
    });
  });
});
