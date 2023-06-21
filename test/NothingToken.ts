import { expect } from "chai";
import { ethers } from "hardhat";
import { Nothing } from "../typechain-types";
import { Contract } from "ethers";

describe("Nothing", function() {
  let token: Nothing | Contract;
  let owner: any;
  let receiver: any;
  let signer1: any;
  let signer2: any;

  const name = "Nothing";
  const symbol = "NOT";
  const initialSupply = ethers.BigNumber.from(1000000);
  const buyFee = 0; // 5%
  const sellFee = 500; // 5%

  beforeEach(async function() {
    const NothingFactory = await ethers.getContractFactory("Nothing");
    [owner, receiver, signer1, signer2] = await ethers.getSigners();

    token = await NothingFactory.deploy(name, symbol, initialSupply);
    await token.deployed();
  });

  it("should set the fee receiver", async function() {
    await token.setFeeReceiver(receiver.address);
    expect(await token.feeReceiver()).to.equal(receiver.address);
  });

  it("should set the market pair", async function() {
    const pairAddress = signer1.address;
    const state = true;

    await token.setMarketPair(pairAddress, state);
    expect(await token.marketPairs(pairAddress)).to.equal(state);
  });

  it("should exclude an account from fees", async function() {
    const account = owner.address;
    const state = true;

    await token.excludeFromFees(account, state);
    expect(await token.excludedFromFees(account)).to.equal(state);
  });

  it("should transfer with the correct buy fee", async function() {
    const amount = 100_000;
    await token.excludeFromFees(owner.address, false);
    await token.setFeeReceiver(signer2.address);
    await token.setMarketPair(owner.address, true);

    const initialSenderBalance = await token.balanceOf(owner.address);
    const initialReceiverBalance = await token.balanceOf(receiver.address);

    await token.transfer(receiver.address, amount);

    const finalSenderBalance = await token.balanceOf(owner.address);
    const finalReceiverBalance = await token.balanceOf(receiver.address);

    const feeAmount = amount * buyFee / 10_000;
    const expectedSenderBalance = initialSenderBalance.sub(amount);
    const expectedReceiverBalance = initialReceiverBalance.add(amount - feeAmount);
    const feeReceiverBalance = await token.balanceOf(signer2.address);

    expect(finalSenderBalance).to.equal(expectedSenderBalance);
    expect(finalReceiverBalance).to.equal(expectedReceiverBalance);
    expect(feeReceiverBalance).to.equal(feeAmount);
  });

  it("should distribute marketing and airdrop fees correctly", async function() {
    const amount = ethers.BigNumber.from(100_000);
    const marketingRatio = 60; // 60%
    const airdropRatio = 40; // 40%

    await token.excludeFromFees(owner.address, false);
    await token.setMarketPair(receiver.address, true);
    await token.setFeeReceiver(signer1.address);
    await token.setRewardReceiver(signer2.address);

    const initialSenderBalance = await token.balanceOf(owner.address);
    const initialFeeReceiverBalance = await token.balanceOf(signer1.address);
    const initialRewardReceiverBalance = await token.balanceOf(signer2.address);

    await token.transfer(receiver.address, amount);

    const finalSenderBalance = await token.balanceOf(owner.address);
    const finalFeeReceiverBalance = await token.balanceOf(signer1.address);
    const finalRewardReceiverBalance = await token.balanceOf(signer2.address);

    const totalTax = amount.mul(sellFee).div(10_000);
    const marketingFee = totalTax.mul(marketingRatio).div(100);
    const airdropFee = totalTax.mul(airdropRatio).div(100);

    const expectedSenderBalance = initialSenderBalance.sub(amount);
    const expectedFeeReceiverBalance = initialFeeReceiverBalance.add(marketingFee);
    const expectedRewardReceiverBalance = initialRewardReceiverBalance.add(airdropFee);

    expect(finalSenderBalance).to.equal(expectedSenderBalance);
    expect(finalFeeReceiverBalance).to.equal(expectedFeeReceiverBalance);
    expect(finalRewardReceiverBalance).to.equal(expectedRewardReceiverBalance);
  });

});
