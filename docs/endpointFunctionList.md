
# Endpoint maps

<p align="center">
  <a href="https://www.npmjs.com/package/@siebly/hyperliquid-api">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/sieblyio/hyperliquid-api/blob/main/docs/images/logoDarkMode2.svg?raw=true#gh-dark-mode-only">
      <img alt="SDK Logo" src="https://github.com/sieblyio/hyperliquid-api/blob/main/docs/images/logoBrightMode2.svg?raw=true#gh-light-mode-only">
    </picture>
  </a>
</p>

Each REST client is a JavaScript class, which provides functions individually mapped to each endpoint available in the exchange's API offering. 

The following table shows all methods available in each REST client, whether the method requires authentication (automatically handled if a private key or signer is provided), as well as the exact endpoint each method is connected to.

Hyperliquid exposes two HTTP paths: `POST /info` and `POST /exchange`. The value in parentheses is the request `type` field from the official docs (for example `allMids`, `order`, `usdSend`). Search this table for that type name to find the SDK function.

This can be used to easily find which method to call, once you have [found which endpoint you're looking to use](https://github.com/sieblyio/awesome-crypto-examples/wiki/How-to-find-SDK-functions-that-match-API-docs-endpoint).

All REST clients are in the [src](/src) folder. For usage examples, make sure to check the [examples](/examples) folder.

List of clients:
- [RestClient](#restclientts)


If anything is missing or wrong, please open an issue or let us know in our [Node.js Traders](https://t.me/nodetraders) telegram group!

## How to use table

Table consists of 4 parts:

- Function name
- AUTH
- HTTP Method
- Endpoint

**Function name** is the name of the function that can be called through the SDK. Check examples folder in the repo for more help on how to use them!

**AUTH** is a boolean value that indicates if the function requires authentication - which means you need to pass your private key or a signer to the SDK. Public Info calls work with `new RestClient()`. Account Info, L1 actions, and user-signed actions need credentials.

**HTTP Method** shows HTTP method that the function uses to call the endpoint. Hyperliquid uses POST for both Info and Exchange.

**Endpoint** is the path plus Hyperliquid `type`. Best way to find exact function you need is to search for the official `type` (or `/info` / `/exchange`) in this table and find corresponding function name.


# RestClient.ts

This table includes all endpoints from the official Exchange API docs and corresponding SDK functions for each endpoint that are found in [RestClient.ts](/src/RestClient.ts). 

WebsocketAPIClient extends RestClient and exposes the same methods over Hyperliquid's WebSocket POST protocol (`info` / `action`).

| Function | AUTH | HTTP Method | Endpoint |
| -------- | :------: | :------: | -------- |
| [getAllMids()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L149) |  | POST | `/info (allMids)` |
| [getActiveAssetData()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L153) | :closed_lock_with_key:  | POST | `/info (activeAssetData)` |
| [getAllBorrowLendReserveStates()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L159) |  | POST | `/info (allBorrowLendReserveStates)` |
| [getAllPerpMetadata()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L163) |  | POST | `/info (allPerpMetas)` |
| [getApprovedBuilders()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L167) | :closed_lock_with_key:  | POST | `/info (approvedBuilders)` |
| [getBorrowLendReserveState()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L171) |  | POST | `/info (borrowLendReserveState)` |
| [getUserBorrowLendState()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L175) | :closed_lock_with_key:  | POST | `/info (borrowLendUserState)` |
| [getCandles()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L179) |  | POST | `/info (candleSnapshot)` |
| [getPerpAccountSummary()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L185) | :closed_lock_with_key:  | POST | `/info (clearinghouseState)` |
| [getStakingDelegations()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L191) | :closed_lock_with_key:  | POST | `/info (delegations)` |
| [getStakingHistory()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L195) | :closed_lock_with_key:  | POST | `/info (delegatorHistory)` |
| [getStakingRewards()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L199) | :closed_lock_with_key:  | POST | `/info (delegatorRewards)` |
| [getStakingSummary()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L203) | :closed_lock_with_key:  | POST | `/info (delegatorSummary)` |
| [getExchangeStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L207) |  | POST | `/info (exchangeStatus)` |
| [getExtraAgents()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L211) | :closed_lock_with_key:  | POST | `/info (extraAgents)` |
| [getFrontendOpenOrders()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L215) | :closed_lock_with_key:  | POST | `/info (frontendOpenOrders)` |
| [getFundingHistory()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L219) |  | POST | `/info (fundingHistory)` |
| [getGossipPriorityAuctionStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L228) |  | POST | `/info (gossipPriorityAuctionStatus)` |
| [getGossipRootIps()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L232) |  | POST | `/info (gossipRootIps)` |
| [getOrderHistory()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L236) | :closed_lock_with_key:  | POST | `/info (historicalOrders)` |
| [getVipStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L240) | :closed_lock_with_key:  | POST | `/info (isVip)` |
| [getOrderBook()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L244) |  | POST | `/info (l2Book)` |
| [getLeadingVaults()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L253) | :closed_lock_with_key:  | POST | `/info (leadingVaults)` |
| [getLegalStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L257) | :closed_lock_with_key:  | POST | `/info (legalCheck)` |
| [getLiquidatablePositions()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L261) |  | POST | `/info (liquidatable)` |
| [getMarginTable()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L265) |  | POST | `/info (marginTable)` |
| [getMaxBuilderFee()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L269) | :closed_lock_with_key:  | POST | `/info (maxBuilderFee)` |
| [getMaxMarketOrderNotionals()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L273) |  | POST | `/info (maxMarketOrderNtls)` |
| [getPerpMetadata()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L277) |  | POST | `/info (meta)` |
| [getPerpAssetContexts()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L281) |  | POST | `/info (metaAndAssetCtxs)` |
| [getOpenOrders()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L285) | :closed_lock_with_key:  | POST | `/info (openOrders)` |
| [getOrderStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L289) | :closed_lock_with_key:  | POST | `/info (orderStatus)` |
| [getOutcomeMetadata()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L293) |  | POST | `/info (outcomeMeta)` |
| [getPerpAnnotation()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L297) |  | POST | `/info (perpAnnotation)` |
| [getPerpCategories()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L301) |  | POST | `/info (perpCategories)` |
| [getConcisePerpAnnotations()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L305) |  | POST | `/info (perpConciseAnnotations)` |
| [getPerpDeployAuctionStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L309) |  | POST | `/info (perpDeployAuctionStatus)` |
| [getPerpDexLimits()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L313) |  | POST | `/info (perpDexLimits)` |
| [getPerpDexStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L317) |  | POST | `/info (perpDexStatus)` |
| [getPerpDexs()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L321) |  | POST | `/info (perpDexs)` |
| [getPerpsAtOpenInterestCap()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L325) |  | POST | `/info (perpsAtOpenInterestCap)` |
| [getPortfolio()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L329) | :closed_lock_with_key:  | POST | `/info (portfolio)` |
| [getPreTransferCheck()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L333) |  | POST | `/info (preTransferCheck)` |
| [getPredictedFundingRates()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L339) |  | POST | `/info (predictedFundings)` |
| [getRecentTrades()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L343) |  | POST | `/info (recentTrades)` |
| [getReferralInfo()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L347) | :closed_lock_with_key:  | POST | `/info (referral)` |
| [getSettledOutcome()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L351) |  | POST | `/info (settledOutcome)` |
| [getBalances()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L355) | :closed_lock_with_key:  | POST | `/info (clearinghouseState, spotClearinghouseState)` |
| [getSpotBalances()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L370) | :closed_lock_with_key:  | POST | `/info (spotClearinghouseState)` |
| [getSpotDeployAuctionStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L374) | :closed_lock_with_key:  | POST | `/info (spotDeployState)` |
| [getSpotMetadata()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L380) |  | POST | `/info (spotMeta)` |
| [getSpotAssetContexts()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L384) |  | POST | `/info (spotMetaAndAssetCtxs)` |
| [getSpotPairDeployAuctionStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L388) |  | POST | `/info (spotPairDeployAuctionStatus)` |
| [getSubAccounts()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L392) | :closed_lock_with_key:  | POST | `/info (subAccounts)` |
| [getSubAccountsWithAllDexStates()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L396) | :closed_lock_with_key:  | POST | `/info (subAccounts2)` |
| [getTokenDetails()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L402) |  | POST | `/info (tokenDetails)` |
| [getTwapHistory()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L406) | :closed_lock_with_key:  | POST | `/info (twapHistory)` |
| [getUserAbstraction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L410) | :closed_lock_with_key:  | POST | `/info (userAbstraction)` |
| [getUserBorrowLendInterest()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L414) | :closed_lock_with_key:  | POST | `/info (userBorrowLendInterest)` |
| [getUserDexAbstraction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L420) | :closed_lock_with_key:  | POST | `/info (userDexAbstraction)` |
| [getUserFees()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L424) | :closed_lock_with_key:  | POST | `/info (userFees)` |
| [getUserFills()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L428) | :closed_lock_with_key:  | POST | `/info (userFills)` |
| [getUserFillsByTime()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L432) | :closed_lock_with_key:  | POST | `/info (userFillsByTime)` |
| [getUserFundingHistory()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L436) | :closed_lock_with_key:  | POST | `/info (userFunding)` |
| [getUserNonFundingLedgerUpdates()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L442) | :closed_lock_with_key:  | POST | `/info (userNonFundingLedgerUpdates)` |
| [getUserRateLimit()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L448) | :closed_lock_with_key:  | POST | `/info (userRateLimit)` |
| [getUserRole()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L452) |  | POST | `/info (userRole)` |
| [getMultiSigSigners()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L456) | :closed_lock_with_key:  | POST | `/info (userToMultiSigSigners)` |
| [getUserTwapSliceFills()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L460) | :closed_lock_with_key:  | POST | `/info (userTwapSliceFills)` |
| [getUserTwapSliceFillsByTime()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L464) | :closed_lock_with_key:  | POST | `/info (userTwapSliceFillsByTime)` |
| [getUserVaultDeposits()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L470) | :closed_lock_with_key:  | POST | `/info (userVaultEquities)` |
| [getValidatorL1Votes()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L474) |  | POST | `/info (validatorL1Votes)` |
| [getValidatorSummaries()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L478) |  | POST | `/info (validatorSummaries)` |
| [getVaultDetails()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L482) |  | POST | `/info (vaultDetails)` |
| [getVaultSummaries()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L486) |  | POST | `/info (vaultSummaries)` |
| [getWebData2()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L490) | :closed_lock_with_key:  | POST | `/info (webData2)` |
| [getAlignedQuoteTokenStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L494) |  | POST | `/info (alignedQuoteTokenInfo)` |
| [submitOrder()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L498) | :closed_lock_with_key:  | POST | `/exchange (order)` |
| [submitMarketOrder()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L509) | :closed_lock_with_key:  | POST | `/exchange (order)` |
| [submitMarketClose()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L558) | :closed_lock_with_key:  | POST | `/exchange (order)` |
| [submitLimitOrder()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L599) | :closed_lock_with_key:  | POST | `/exchange (order)` |
| [modifyOrder()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L631) | :closed_lock_with_key:  | POST | `/exchange (modify)` |
| [modifyOrders()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L641) | :closed_lock_with_key:  | POST | `/exchange (batchModify)` |
| [cancelOrders()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L654) | :closed_lock_with_key:  | POST | `/exchange (cancel)` |
| [cancelOrdersByClientOrderId()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L667) | :closed_lock_with_key:  | POST | `/exchange (cancelByCloid)` |
| [updateLeverage()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L680) | :closed_lock_with_key:  | POST | `/exchange (updateLeverage)` |
| [updateIsolatedMargin()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L695) | :closed_lock_with_key:  | POST | `/exchange (updateIsolatedMargin)` |
| [setIsolatedMarginLeverage()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L702) | :closed_lock_with_key:  | POST | `/exchange (topUpIsolatedOnlyMargin)` |
| [submitTwapOrder()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L713) | :closed_lock_with_key:  | POST | `/exchange (twapOrder)` |
| [cancelTwapOrder()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L720) | :closed_lock_with_key:  | POST | `/exchange (twapCancel)` |
| [setCancelAllAfter()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L727) | :closed_lock_with_key:  | POST | `/exchange (scheduleCancel)` |
| [setReferrer()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L734) | :closed_lock_with_key:  | POST | `/exchange (setReferrer)` |
| [registerReferrer()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L740) | :closed_lock_with_key:  | POST | `/exchange (registerReferrer)` |
| [approveBuilderFee()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L747) | :closed_lock_with_key:  | POST | `/exchange (approveBuilderFee)` |
| [approveApiWallet()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L766) | :closed_lock_with_key:  | POST | `/exchange (approveAgent)` |
| [sendUsd()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L781) | :closed_lock_with_key:  | POST | `/exchange (usdSend)` |
| [sendSpotAsset()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L793) | :closed_lock_with_key:  | POST | `/exchange (spotSend)` |
| [withdrawUsd()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L805) | :closed_lock_with_key:  | POST | `/exchange (withdraw3)` |
| [transferUsdBetweenSpotAndPerp()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L817) | :closed_lock_with_key:  | POST | `/exchange (usdClassTransfer)` |
| [sendAsset()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L829) | :closed_lock_with_key:  | POST | `/exchange (sendAsset)` |
| [sendToEvmWithData()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L845) | :closed_lock_with_key:  | POST | `/exchange (sendToEvmWithData)` |
| [sendAssetFromApiWallet()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L857) | :closed_lock_with_key:  | POST | `/exchange (agentSendAsset)` |
| [depositIntoStaking()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L873) | :closed_lock_with_key:  | POST | `/exchange (cDeposit)` |
| [withdrawFromStaking()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L885) | :closed_lock_with_key:  | POST | `/exchange (cWithdraw)` |
| [delegateOrUndelegateStake()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L897) | :closed_lock_with_key:  | POST | `/exchange (tokenDelegate)` |
| [convertToMultiSigUser()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L909) | :closed_lock_with_key:  | POST | `/exchange (convertToMultiSigUser)` |
| [linkStakingAccount()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L932) | :closed_lock_with_key:  | POST | `/exchange (linkStakingUser)` |
| [disableStakingTradingLink()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L944) | :closed_lock_with_key:  | POST | `/exchange (stakingLinkDisableTradingUser)` |
| [setUserPortfolioMargin()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L956) | :closed_lock_with_key:  | POST | `/exchange (userPortfolioMargin)` |
| [setUserAbstraction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L968) | :closed_lock_with_key:  | POST | `/exchange (userSetAbstraction)` |
| [setUserDexAbstraction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L980) | :closed_lock_with_key:  | POST | `/exchange (userDexAbstraction)` |
| [enableApiWalletDexAbstraction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L992) | :closed_lock_with_key:  | POST | `/exchange (agentEnableDexAbstraction)` |
| [setApiWalletAbstraction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L998) | :closed_lock_with_key:  | POST | `/exchange (agentSetAbstraction)` |
| [executeBorrowLendOperation()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1005) | :closed_lock_with_key:  | POST | `/exchange (borrowLend)` |
| [claimRewards()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1023) | :closed_lock_with_key:  | POST | `/exchange (claimRewards)` |
| [createSubAccount()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1027) | :closed_lock_with_key:  | POST | `/exchange (createSubAccount)` |
| [createVault()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1034) | :closed_lock_with_key:  | POST | `/exchange (createVault)` |
| [setEvmBigBlocks()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1043) | :closed_lock_with_key:  | POST | `/exchange (evmUserModify)` |
| [finalizeEvmContract()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1050) | :closed_lock_with_key:  | POST | `/exchange (finalizeEvmContract)` |
| [submitGossipPriorityBid()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1063) | :closed_lock_with_key:  | POST | `/exchange (gossipPriorityBid)` |
| [transferHip3LiquidatorFunds()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1070) | :closed_lock_with_key:  | POST | `/exchange (hip3LiquidatorTransfer)` |
| [invalidateNonce()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1077) | :closed_lock_with_key:  | POST | `/exchange (noop)` |
| [deployPerp()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1081) | :closed_lock_with_key:  | POST | `/exchange (perpDeploy)` |
| [deploySpot()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1088) | :closed_lock_with_key:  | POST | `/exchange (spotDeploy)` |
| [reserveAdditionalActions()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1095) | :closed_lock_with_key:  | POST | `/exchange (reserveRequestWeight)` |
| [setDisplayName()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1102) | :closed_lock_with_key:  | POST | `/exchange (setDisplayName)` |
| [setSpotDusting()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1109) | :closed_lock_with_key:  | POST | `/exchange (spotUser)` |
| [renameSubAccount()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1116) | :closed_lock_with_key:  | POST | `/exchange (subAccountModify)` |
| [transferSpotToOrFromSubAccount()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1123) | :closed_lock_with_key:  | POST | `/exchange (subAccountSpotTransfer)` |
| [transferUsdToOrFromSubAccount()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1134) | :closed_lock_with_key:  | POST | `/exchange (subAccountTransfer)` |
| [transferVaultFunds()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1141) | :closed_lock_with_key:  | POST | `/exchange (vaultTransfer)` |
| [distributeVaultFunds()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1148) | :closed_lock_with_key:  | POST | `/exchange (vaultDistribute)` |
| [modifyVault()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1155) | :closed_lock_with_key:  | POST | `/exchange (vaultModify)` |
| [updateValidatorL1Stream()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1174) | :closed_lock_with_key:  | POST | `/exchange (validatorL1Stream)` |
| [submitSignerAction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1185) | :closed_lock_with_key:  | POST | `/exchange (CSignerAction)` |
| [submitValidatorAction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1192) | :closed_lock_with_key:  | POST | `/exchange (CValidatorAction)` |
| [authorizeAqav2Role()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1199) | :closed_lock_with_key:  | POST | `/exchange (authorizeAqav2Role)` |
| [submitUserOutcome()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1206) | :closed_lock_with_key:  | POST | `/exchange (userOutcome)` |