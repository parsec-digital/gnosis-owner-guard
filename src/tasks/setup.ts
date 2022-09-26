import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import { task, types } from "hardhat/config";
import { deployAndSetUpModule } from "@gnosis.pm/zodiac";
import { HardhatRuntimeEnvironment } from "hardhat/types";

interface OwnerGuardTaskArgs {
  owner: string;
  proxied: boolean;
}

const deployOwnerGuard = async (
  taskArgs: OwnerGuardTaskArgs,
  hardhatRuntime: HardhatRuntimeEnvironment
) => {
  const [caller] = await hardhatRuntime.ethers.getSigners();
  console.log("Using the account:", caller.address);

  if (taskArgs.proxied) {
    const chainId = await hardhatRuntime.getChainId();
    const { transaction } = deployAndSetUpModule(
      "ownerGuard",
      {
        types: ["address"],
        values: [taskArgs.owner],
      },
      hardhatRuntime.ethers.provider,
      Number(chainId),
      Date.now().toString()
    );

    const deploymentTransaction = await caller.sendTransaction(transaction);
    const receipt = await deploymentTransaction.wait();
    console.log("OwnerGuard deployed to:", receipt.logs[1].address);
    return;
  }

  const Guard = await hardhatRuntime.ethers.getContractFactory("OwnerGuard");
  const guard = await Guard.deploy(taskArgs.owner);
  console.log("OwnerGuard deployed to:", guard.address);
};

task("setup", "Deploys a OwnerGuard")
  .addParam("owner", "Address of the Owner", undefined, types.string)
  .addParam(
    "proxied",
    "Deploys contract through factory",
    false,
    types.boolean,
    true
  )
  .setAction(deployOwnerGuard);

task("verifyEtherscan", "Verifies the contract on etherscan")
  .addParam("guard", "Address of the OwnerGuard", undefined, types.string)
  .addParam("owner", "Address of the Owner", undefined, types.string)
  .setAction(async (taskArgs, hardhatRuntime) => {
    const [caller] = await hardhatRuntime.ethers.getSigners();
    await hardhatRuntime.run("verify:verify", {
      address: taskArgs.guard,
      constructorArguments: [taskArgs.owner],
    });
  });

task(
  "transferOwnership",
  "Toggles whether a target address is scoped to specific functions."
)
  .addParam(
    "guard",
    "The address of the guard that you are seting up.",
    undefined,
    types.string
  )
  .addParam(
    "newowner",
    "The address that will be the new owner of the gaurd.",
    undefined,
    types.string
  )
  .setAction(async (taskArgs, hardhatRuntime) => {
    const [caller] = await hardhatRuntime.ethers.getSigners();
    console.log("Using the account:", caller.address);
    const guard = await hardhatRuntime.ethers.getContractAt(
      "OwnerGuard",
      taskArgs.guard
    );
    let tx = await guard.transferOwnership(taskArgs.newowner);
    let receipt = await tx.wait();

    console.log("OwnerGuard now owned by: ", await guard.owner());
  });

export {};
