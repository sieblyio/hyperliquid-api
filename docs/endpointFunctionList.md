
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

**AUTH** marks methods that require a private key or signer. All `/info` reads are public and work with `new RestClient()`. For account reads, pass the public account address as `user`, or configure `accountAddress` or `vaultAddress` on the client. L1 actions and user-signed actions sent to `/exchange` require credentials.

**HTTP Method** shows HTTP method that the function uses to call the endpoint. Hyperliquid uses POST for both Info and Exchange.

**Endpoint** is the path plus Hyperliquid `type`. Best way to find exact function you need is to search for the official `type` (or `/info` / `/exchange`) in this table and find corresponding function name.


# RestClient.ts

This table lists the named SDK methods implemented in [RestClient.ts](/src/RestClient.ts) and their corresponding Hyperliquid request types.

WebsocketAPIClient extends RestClient and exposes the same methods over Hyperliquid's WebSocket POST protocol (`info` / `action`).

| Function | AUTH | HTTP Method | Endpoint |
| -------- | :------: | :------: | -------- |
| [getAllMids()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L181) |  | POST | `/info (allMids)` |
| [getActiveAssetData()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L189) |  | POST | `/info (activeAssetData)` |
| [getAllBorrowLendReserveStates()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L200) |  | POST | `/info (allBorrowLendReserveStates)` |
| [getAllPerpMetadata()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L210) |  | POST | `/info (allPerpMetas)` |
| [getApprovedBuilders()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L217) |  | POST | `/info (approvedBuilders)` |
| [getBorrowLendReserveState()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L224) |  | POST | `/info (borrowLendReserveState)` |
| [getUserBorrowLendState()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L235) |  | POST | `/info (borrowLendUserState)` |
| [getCandles()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L247) |  | POST | `/info (candleSnapshot)` |
| [getPerpAccountSummary()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L260) |  | POST | `/info (clearinghouseState)` |
| [getStakingDelegations()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L269) |  | POST | `/info (delegations)` |
| [getStakingHistory()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L280) |  | POST | `/info (delegatorHistory)` |
| [getStakingRewards()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L291) |  | POST | `/info (delegatorRewards)` |
| [getStakingSummary()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L298) |  | POST | `/info (delegatorSummary)` |
| [getExchangeStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L302) |  | POST | `/info (exchangeStatus)` |
| [getExtraAgents()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L306) |  | POST | `/info (extraAgents)` |
| [getFrontendOpenOrders()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L315) |  | POST | `/info (frontendOpenOrders)` |
| [getFundingHistory()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L324) |  | POST | `/info (fundingHistory)` |
| [getGossipPriorityAuctionStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L333) |  | POST | `/info (gossipPriorityAuctionStatus)` |
| [getGossipRootIps()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L337) |  | POST | `/info (gossipRootIps)` |
| [getOrderHistory()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L346) |  | POST | `/info (historicalOrders)` |
| [getVipStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L350) |  | POST | `/info (isVip)` |
| [getOrderBook()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L360) |  | POST | `/info (l2Book)` |
| [getLeadingVaults()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L369) |  | POST | `/info (leadingVaults)` |
| [getLegalStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L373) |  | POST | `/info (legalCheck)` |
| [getLiquidatablePositions()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L377) |  | POST | `/info (liquidatable)` |
| [getMarginTable()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L381) |  | POST | `/info (marginTable)` |
| [getMaxBuilderFee()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L390) |  | POST | `/info (maxBuilderFee)` |
| [getMaxMarketOrderNotionals()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L394) |  | POST | `/info (maxMarketOrderNtls)` |
| [getPerpMetadata()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L403) |  | POST | `/info (meta)` |
| [getPerpAssetContexts()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L414) |  | POST | `/info (metaAndAssetCtxs)` |
| [getOpenOrders()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L426) |  | POST | `/info (openOrders)` |
| [getOrderStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L436) |  | POST | `/info (orderStatus)` |
| [getOutcomeMetadata()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L443) |  | POST | `/info (outcomeMeta)` |
| [getOutcomeDeployerLimits()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L452) |  | POST | `/info (outcomeDeployerLimits)` |
| [getPerpAnnotation()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L463) |  | POST | `/info (perpAnnotation)` |
| [getPerpCategories()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L472) |  | POST | `/info (perpCategories)` |
| [getConcisePerpAnnotations()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L481) |  | POST | `/info (perpConciseAnnotations)` |
| [getPerpDeployAuctionStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L488) |  | POST | `/info (perpDeployAuctionStatus)` |
| [getPerpDexLimits()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L497) |  | POST | `/info (perpDexLimits)` |
| [getPerpDexStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L506) |  | POST | `/info (perpDexStatus)` |
| [getPerpDexs()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L516) |  | POST | `/info (perpDexs)` |
| [getPerpsAtOpenInterestCap()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L525) |  | POST | `/info (perpsAtOpenInterestCap)` |
| [getPortfolio()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L535) |  | POST | `/info (portfolio)` |
| [getPreTransferCheck()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L539) |  | POST | `/info (preTransferCheck)` |
| [getPredictedFundingRates()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L552) |  | POST | `/info (predictedFundings)` |
| [getRecentTrades()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L556) |  | POST | `/info (recentTrades)` |
| [getReferralInfo()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L567) |  | POST | `/info (referral)` |
| [getSettledOutcome()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L576) |  | POST | `/info (settledOutcome)` |
| [getBalances()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L582) |  | POST | `/info (clearinghouseState, spotClearinghouseState)` |
| [getSpotBalances()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L603) |  | POST | `/info (spotClearinghouseState)` |
| [getSpotDeployAuctionStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L610) |  | POST | `/info (spotDeployState)` |
| [getSpotMetadata()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L619) |  | POST | `/info (spotMeta)` |
| [getSpotAssetContexts()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L629) |  | POST | `/info (spotMetaAndAssetCtxs)` |
| [getSpotPairDeployAuctionStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L636) |  | POST | `/info (spotPairDeployAuctionStatus)` |
| [getSubAccounts()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L645) |  | POST | `/info (subAccounts)` |
| [getSubAccountsWithAllDexStates()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L649) |  | POST | `/info (subAccounts2)` |
| [getTokenDetails()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L661) |  | POST | `/info (tokenDetails)` |
| [getTwapHistory()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L665) |  | POST | `/info (twapHistory)` |
| [getUserAbstraction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L672) |  | POST | `/info (userAbstraction)` |
| [getUserBorrowLendInterest()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L676) |  | POST | `/info (userBorrowLendInterest)` |
| [getUserDexAbstraction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L685) |  | POST | `/info (userDexAbstraction)` |
| [getUserFees()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L692) |  | POST | `/info (userFees)` |
| [getUserFills()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L702) |  | POST | `/info (userFills)` |
| [getUserFillsByTime()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L712) |  | POST | `/info (userFillsByTime)` |
| [getUserFundingHistory()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L721) |  | POST | `/info (userFunding)` |
| [getUserNonFundingLedgerUpdates()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L734) |  | POST | `/info (userNonFundingLedgerUpdates)` |
| [getUserRateLimit()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L746) |  | POST | `/info (userRateLimit)` |
| [getUserRole()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L756) |  | POST | `/info (userRole)` |
| [getMultiSigSigners()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L760) |  | POST | `/info (userToMultiSigSigners)` |
| [getUserTwapSliceFills()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L769) |  | POST | `/info (userTwapSliceFills)` |
| [getUserTwapSliceFillsByTime()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L773) |  | POST | `/info (userTwapSliceFillsByTime)` |
| [getUserVaultDeposits()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L782) |  | POST | `/info (userVaultEquities)` |
| [getValidatorL1Votes()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L788) |  | POST | `/info (validatorL1Votes)` |
| [getValidatorSummaries()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L792) |  | POST | `/info (validatorSummaries)` |
| [getVaultDetails()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L802) |  | POST | `/info (vaultDetails)` |
| [getVaultSummaries()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L808) |  | POST | `/info (vaultSummaries)` |
| [getWebData2()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L812) |  | POST | `/info (webData2)` |
| [getAlignedQuoteTokenStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L816) |  | POST | `/info (alignedQuoteTokenInfo)` |
| [submitOrder()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L826) | :closed_lock_with_key:  | POST | `/exchange (order)` |
| [submitMarketOrder()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L842) | :closed_lock_with_key:  | POST | `/exchange (order)` |
| [submitMarketClose()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L896) | :closed_lock_with_key:  | POST | `/exchange (order)` |
| [submitLimitOrder()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L940) | :closed_lock_with_key:  | POST | `/exchange (order)` |
| [modifyOrder()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L979) | :closed_lock_with_key:  | POST | `/exchange (modify)` |
| [modifyOrders()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L995) | :closed_lock_with_key:  | POST | `/exchange (batchModify)` |
| [cancelOrders()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1014) | :closed_lock_with_key:  | POST | `/exchange (cancel)` |
| [cancelOrdersByClientOrderId()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1032) | :closed_lock_with_key:  | POST | `/exchange (cancelByCloid)` |
| [updateLeverage()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1048) | :closed_lock_with_key:  | POST | `/exchange (updateLeverage)` |
| [updateIsolatedMargin()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1068) | :closed_lock_with_key:  | POST | `/exchange (updateIsolatedMargin)` |
| [setIsolatedMarginLeverage()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1080) | :closed_lock_with_key:  | POST | `/exchange (topUpIsolatedOnlyMargin)` |
| [submitTwapOrder()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1096) | :closed_lock_with_key:  | POST | `/exchange (twapOrder)` |
| [cancelTwapOrder()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1108) | :closed_lock_with_key:  | POST | `/exchange (twapCancel)` |
| [setCancelAllAfter()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1121) | :closed_lock_with_key:  | POST | `/exchange (scheduleCancel)` |
| [setReferrer()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1128) | :closed_lock_with_key:  | POST | `/exchange (setReferrer)` |
| [registerReferrer()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1134) | :closed_lock_with_key:  | POST | `/exchange (registerReferrer)` |
| [approveBuilderFee()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1146) | :closed_lock_with_key:  | POST | `/exchange (approveBuilderFee)` |
| [approveApiWallet()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1172) | :closed_lock_with_key:  | POST | `/exchange (approveAgent)` |
| [sendUsd()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1192) | :closed_lock_with_key:  | POST | `/exchange (usdSend)` |
| [sendSpotAsset()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1209) | :closed_lock_with_key:  | POST | `/exchange (spotSend)` |
| [withdrawUsd()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1224) | :closed_lock_with_key:  | POST | `/exchange (withdraw3)` |
| [transferUsdBetweenSpotAndPerp()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1241) | :closed_lock_with_key:  | POST | `/exchange (usdClassTransfer)` |
| [sendAsset()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1259) | :closed_lock_with_key:  | POST | `/exchange (sendAsset)` |
| [sendToEvmWithData()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1280) | :closed_lock_with_key:  | POST | `/exchange (sendToEvmWithData)` |
| [sendAssetFromApiWallet()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1297) | :closed_lock_with_key:  | POST | `/exchange (agentSendAsset)` |
| [depositIntoStaking()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1318) | :closed_lock_with_key:  | POST | `/exchange (cDeposit)` |
| [withdrawFromStaking()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1335) | :closed_lock_with_key:  | POST | `/exchange (cWithdraw)` |
| [delegateOrUndelegateStake()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1352) | :closed_lock_with_key:  | POST | `/exchange (tokenDelegate)` |
| [convertToMultiSigUser()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1364) | :closed_lock_with_key:  | POST | `/exchange (convertToMultiSigUser)` |
| [linkStakingAccount()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1387) | :closed_lock_with_key:  | POST | `/exchange (linkStakingUser)` |
| [disableStakingTradingLink()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1399) | :closed_lock_with_key:  | POST | `/exchange (stakingLinkDisableTradingUser)` |
| [setUserPortfolioMargin()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1411) | :closed_lock_with_key:  | POST | `/exchange (userPortfolioMargin)` |
| [setUserAbstraction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1428) | :closed_lock_with_key:  | POST | `/exchange (userSetAbstraction)` |
| [setUserDexAbstraction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1445) | :closed_lock_with_key:  | POST | `/exchange (userDexAbstraction)` |
| [enableApiWalletDexAbstraction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1462) | :closed_lock_with_key:  | POST | `/exchange (agentEnableDexAbstraction)` |
| [setApiWalletAbstraction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1473) | :closed_lock_with_key:  | POST | `/exchange (agentSetAbstraction)` |
| [executeBorrowLendOperation()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1480) | :closed_lock_with_key:  | POST | `/exchange (borrowLend)` |
| [claimRewards()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1501) | :closed_lock_with_key:  | POST | `/exchange (claimRewards)` |
| [createSubAccount()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1507) | :closed_lock_with_key:  | POST | `/exchange (createSubAccount)` |
| [createVault()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1514) | :closed_lock_with_key:  | POST | `/exchange (createVault)` |
| [setEvmBigBlocks()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1523) | :closed_lock_with_key:  | POST | `/exchange (evmUserModify)` |
| [finalizeEvmContract()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1530) | :closed_lock_with_key:  | POST | `/exchange (finalizeEvmContract)` |
| [submitGossipPriorityBid()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1543) | :closed_lock_with_key:  | POST | `/exchange (gossipPriorityBid)` |
| [transferHip3LiquidatorFunds()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1556) | :closed_lock_with_key:  | POST | `/exchange (hip3LiquidatorTransfer)` |
| [invalidateNonce()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1566) | :closed_lock_with_key:  | POST | `/exchange (noop)` |
| [deployPerp()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1572) | :closed_lock_with_key:  | POST | `/exchange (perpDeploy)` |
| [deploySpot()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1579) | :closed_lock_with_key:  | POST | `/exchange (spotDeploy)` |
| [reserveAdditionalActions()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1591) | :closed_lock_with_key:  | POST | `/exchange (reserveRequestWeight)` |
| [setDisplayName()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1598) | :closed_lock_with_key:  | POST | `/exchange (setDisplayName)` |
| [setSpotDusting()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1605) | :closed_lock_with_key:  | POST | `/exchange (spotUser)` |
| [renameSubAccount()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1612) | :closed_lock_with_key:  | POST | `/exchange (subAccountModify)` |
| [transferSpotToOrFromSubAccount()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1619) | :closed_lock_with_key:  | POST | `/exchange (subAccountSpotTransfer)` |
| [transferUsdToOrFromSubAccount()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1630) | :closed_lock_with_key:  | POST | `/exchange (subAccountTransfer)` |
| [transferVaultFunds()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1640) | :closed_lock_with_key:  | POST | `/exchange (vaultTransfer)` |
| [distributeVaultFunds()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1647) | :closed_lock_with_key:  | POST | `/exchange (vaultDistribute)` |
| [modifyVault()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1654) | :closed_lock_with_key:  | POST | `/exchange (vaultModify)` |
| [updateValidatorL1Stream()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1678) | :closed_lock_with_key:  | POST | `/exchange (validatorL1Stream)` |
| [submitSignerAction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1689) | :closed_lock_with_key:  | POST | `/exchange (CSignerAction)` |
| [submitValidatorAction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1696) | :closed_lock_with_key:  | POST | `/exchange (CValidatorAction)` |
| [authorizeAqav2Role()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1709) | :closed_lock_with_key:  | POST | `/exchange (authorizeAqav2Role)` |
| [submitUserOutcome()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1724) | :closed_lock_with_key:  | POST | `/exchange (userOutcome)` |
