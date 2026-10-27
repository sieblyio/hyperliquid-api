
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
| [getAllMids()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L198) |  | POST | `/info (allMids)` |
| [getActiveAssetData()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L206) | :closed_lock_with_key:  | POST | `/info (activeAssetData)` |
| [getAllBorrowLendReserveStates()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L217) |  | POST | `/info (allBorrowLendReserveStates)` |
| [getAllPerpMetadata()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L227) |  | POST | `/info (allPerpMetas)` |
| [getApprovedBuilders()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L234) | :closed_lock_with_key:  | POST | `/info (approvedBuilders)` |
| [getBorrowLendReserveState()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L241) |  | POST | `/info (borrowLendReserveState)` |
| [getUserBorrowLendState()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L252) | :closed_lock_with_key:  | POST | `/info (borrowLendUserState)` |
| [getCandles()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L264) |  | POST | `/info (candleSnapshot)` |
| [getPerpAccountSummary()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L277) | :closed_lock_with_key:  | POST | `/info (clearinghouseState)` |
| [getStakingDelegations()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L286) | :closed_lock_with_key:  | POST | `/info (delegations)` |
| [getStakingHistory()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L297) | :closed_lock_with_key:  | POST | `/info (delegatorHistory)` |
| [getStakingRewards()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L308) | :closed_lock_with_key:  | POST | `/info (delegatorRewards)` |
| [getStakingSummary()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L315) | :closed_lock_with_key:  | POST | `/info (delegatorSummary)` |
| [getExchangeStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L319) |  | POST | `/info (exchangeStatus)` |
| [getExtraAgents()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L323) | :closed_lock_with_key:  | POST | `/info (extraAgents)` |
| [getFrontendOpenOrders()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L332) | :closed_lock_with_key:  | POST | `/info (frontendOpenOrders)` |
| [getFundingHistory()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L341) |  | POST | `/info (fundingHistory)` |
| [getGossipPriorityAuctionStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L350) |  | POST | `/info (gossipPriorityAuctionStatus)` |
| [getGossipRootIps()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L354) |  | POST | `/info (gossipRootIps)` |
| [getOrderHistory()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L363) | :closed_lock_with_key:  | POST | `/info (historicalOrders)` |
| [getVipStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L367) | :closed_lock_with_key:  | POST | `/info (isVip)` |
| [getOrderBook()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L377) |  | POST | `/info (l2Book)` |
| [getLeadingVaults()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L386) | :closed_lock_with_key:  | POST | `/info (leadingVaults)` |
| [getLegalStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L390) | :closed_lock_with_key:  | POST | `/info (legalCheck)` |
| [getLiquidatablePositions()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L394) |  | POST | `/info (liquidatable)` |
| [getMarginTable()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L398) |  | POST | `/info (marginTable)` |
| [getMaxBuilderFee()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L407) | :closed_lock_with_key:  | POST | `/info (maxBuilderFee)` |
| [getMaxMarketOrderNotionals()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L411) |  | POST | `/info (maxMarketOrderNtls)` |
| [getPerpMetadata()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L420) |  | POST | `/info (meta)` |
| [getPerpAssetContexts()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L431) |  | POST | `/info (metaAndAssetCtxs)` |
| [getOpenOrders()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L443) | :closed_lock_with_key:  | POST | `/info (openOrders)` |
| [getOrderStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L453) | :closed_lock_with_key:  | POST | `/info (orderStatus)` |
| [getOutcomeMetadata()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L460) |  | POST | `/info (outcomeMeta)` |
| [getOutcomeDeployerLimits()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L469) |  | POST | `/info (outcomeDeployerLimits)` |
| [getPerpAnnotation()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L480) |  | POST | `/info (perpAnnotation)` |
| [getPerpCategories()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L489) |  | POST | `/info (perpCategories)` |
| [getConcisePerpAnnotations()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L498) |  | POST | `/info (perpConciseAnnotations)` |
| [getPerpDeployAuctionStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L505) |  | POST | `/info (perpDeployAuctionStatus)` |
| [getPerpDexLimits()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L514) |  | POST | `/info (perpDexLimits)` |
| [getPerpDexStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L523) |  | POST | `/info (perpDexStatus)` |
| [getPerpDexs()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L533) |  | POST | `/info (perpDexs)` |
| [getPerpsAtOpenInterestCap()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L542) |  | POST | `/info (perpsAtOpenInterestCap)` |
| [getPortfolio()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L552) | :closed_lock_with_key:  | POST | `/info (portfolio)` |
| [getPreTransferCheck()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L556) |  | POST | `/info (preTransferCheck)` |
| [getPredictedFundingRates()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L569) |  | POST | `/info (predictedFundings)` |
| [getRecentTrades()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L573) |  | POST | `/info (recentTrades)` |
| [getReferralInfo()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L584) | :closed_lock_with_key:  | POST | `/info (referral)` |
| [getSettledOutcome()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L593) |  | POST | `/info (settledOutcome)` |
| [getBalances()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L599) | :closed_lock_with_key:  | POST | `/info (clearinghouseState, spotClearinghouseState)` |
| [getSpotBalances()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L620) | :closed_lock_with_key:  | POST | `/info (spotClearinghouseState)` |
| [getSpotDeployAuctionStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L627) | :closed_lock_with_key:  | POST | `/info (spotDeployState)` |
| [getSpotMetadata()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L636) |  | POST | `/info (spotMeta)` |
| [getSpotAssetContexts()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L646) |  | POST | `/info (spotMetaAndAssetCtxs)` |
| [getSpotPairDeployAuctionStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L653) |  | POST | `/info (spotPairDeployAuctionStatus)` |
| [getSubAccounts()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L662) | :closed_lock_with_key:  | POST | `/info (subAccounts)` |
| [getSubAccountsWithAllDexStates()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L666) | :closed_lock_with_key:  | POST | `/info (subAccounts2)` |
| [getTokenDetails()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L678) |  | POST | `/info (tokenDetails)` |
| [getTwapHistory()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L682) | :closed_lock_with_key:  | POST | `/info (twapHistory)` |
| [getUserAbstraction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L689) | :closed_lock_with_key:  | POST | `/info (userAbstraction)` |
| [getUserBorrowLendInterest()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L693) | :closed_lock_with_key:  | POST | `/info (userBorrowLendInterest)` |
| [getUserDexAbstraction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L702) | :closed_lock_with_key:  | POST | `/info (userDexAbstraction)` |
| [getUserFees()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L709) | :closed_lock_with_key:  | POST | `/info (userFees)` |
| [getUserFills()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L719) | :closed_lock_with_key:  | POST | `/info (userFills)` |
| [getUserFillsByTime()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L729) | :closed_lock_with_key:  | POST | `/info (userFillsByTime)` |
| [getUserFundingHistory()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L738) | :closed_lock_with_key:  | POST | `/info (userFunding)` |
| [getUserNonFundingLedgerUpdates()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L751) | :closed_lock_with_key:  | POST | `/info (userNonFundingLedgerUpdates)` |
| [getUserRateLimit()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L763) | :closed_lock_with_key:  | POST | `/info (userRateLimit)` |
| [getUserRole()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L773) |  | POST | `/info (userRole)` |
| [getMultiSigSigners()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L777) | :closed_lock_with_key:  | POST | `/info (userToMultiSigSigners)` |
| [getUserTwapSliceFills()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L788) | :closed_lock_with_key:  | POST | `/info (userTwapSliceFills)` |
| [getUserTwapSliceFillsByTime()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L792) | :closed_lock_with_key:  | POST | `/info (userTwapSliceFillsByTime)` |
| [getUserVaultDeposits()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L801) | :closed_lock_with_key:  | POST | `/info (userVaultEquities)` |
| [getValidatorL1Votes()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L807) |  | POST | `/info (validatorL1Votes)` |
| [getValidatorSummaries()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L811) |  | POST | `/info (validatorSummaries)` |
| [getVaultDetails()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L821) |  | POST | `/info (vaultDetails)` |
| [getVaultSummaries()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L827) |  | POST | `/info (vaultSummaries)` |
| [getWebData2()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L831) | :closed_lock_with_key:  | POST | `/info (webData2)` |
| [getAlignedQuoteTokenStatus()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L836) |  | POST | `/info (alignedQuoteTokenInfo)` |
| [submitOrder()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L848) | :closed_lock_with_key:  | POST | `/exchange (order)` |
| [submitMarketOrder()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L864) | :closed_lock_with_key:  | POST | `/exchange (order)` |
| [submitMarketClose()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L919) | :closed_lock_with_key:  | POST | `/exchange (order)` |
| [submitLimitOrder()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L963) | :closed_lock_with_key:  | POST | `/exchange (order)` |
| [modifyOrder()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1005) | :closed_lock_with_key:  | POST | `/exchange (modify)` |
| [modifyOrders()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1021) | :closed_lock_with_key:  | POST | `/exchange (batchModify)` |
| [cancelOrders()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1040) | :closed_lock_with_key:  | POST | `/exchange (cancel)` |
| [cancelOrdersByClientOrderId()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1058) | :closed_lock_with_key:  | POST | `/exchange (cancelByCloid)` |
| [updateLeverage()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1074) | :closed_lock_with_key:  | POST | `/exchange (updateLeverage)` |
| [updateIsolatedMargin()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1094) | :closed_lock_with_key:  | POST | `/exchange (updateIsolatedMargin)` |
| [setIsolatedMarginLeverage()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1106) | :closed_lock_with_key:  | POST | `/exchange (topUpIsolatedOnlyMargin)` |
| [submitTwapOrder()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1122) | :closed_lock_with_key:  | POST | `/exchange (twapOrder)` |
| [cancelTwapOrder()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1134) | :closed_lock_with_key:  | POST | `/exchange (twapCancel)` |
| [setCancelAllAfter()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1147) | :closed_lock_with_key:  | POST | `/exchange (scheduleCancel)` |
| [setReferrer()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1154) | :closed_lock_with_key:  | POST | `/exchange (setReferrer)` |
| [registerReferrer()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1160) | :closed_lock_with_key:  | POST | `/exchange (registerReferrer)` |
| [approveApiWallet()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1198) | :closed_lock_with_key:  | POST | `/exchange (approveAgent)` |
| [sendUsd()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1218) | :closed_lock_with_key:  | POST | `/exchange (usdSend)` |
| [sendSpotAsset()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1235) | :closed_lock_with_key:  | POST | `/exchange (spotSend)` |
| [withdrawUsd()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1250) | :closed_lock_with_key:  | POST | `/exchange (withdraw3)` |
| [transferUsdBetweenSpotAndPerp()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1267) | :closed_lock_with_key:  | POST | `/exchange (usdClassTransfer)` |
| [sendAsset()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1285) | :closed_lock_with_key:  | POST | `/exchange (sendAsset)` |
| [sendToEvmWithData()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1306) | :closed_lock_with_key:  | POST | `/exchange (sendToEvmWithData)` |
| [sendAssetFromApiWallet()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1323) | :closed_lock_with_key:  | POST | `/exchange (agentSendAsset)` |
| [depositIntoStaking()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1344) | :closed_lock_with_key:  | POST | `/exchange (cDeposit)` |
| [withdrawFromStaking()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1361) | :closed_lock_with_key:  | POST | `/exchange (cWithdraw)` |
| [delegateOrUndelegateStake()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1378) | :closed_lock_with_key:  | POST | `/exchange (tokenDelegate)` |
| [convertToMultiSigUser()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1390) | :closed_lock_with_key:  | POST | `/exchange (convertToMultiSigUser)` |
| [linkStakingAccount()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1413) | :closed_lock_with_key:  | POST | `/exchange (linkStakingUser)` |
| [disableStakingTradingLink()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1425) | :closed_lock_with_key:  | POST | `/exchange (stakingLinkDisableTradingUser)` |
| [setUserPortfolioMargin()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1437) | :closed_lock_with_key:  | POST | `/exchange (userPortfolioMargin)` |
| [setUserAbstraction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1454) | :closed_lock_with_key:  | POST | `/exchange (userSetAbstraction)` |
| [setUserDexAbstraction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1471) | :closed_lock_with_key:  | POST | `/exchange (userDexAbstraction)` |
| [enableApiWalletDexAbstraction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1488) | :closed_lock_with_key:  | POST | `/exchange (agentEnableDexAbstraction)` |
| [setApiWalletAbstraction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1499) | :closed_lock_with_key:  | POST | `/exchange (agentSetAbstraction)` |
| [executeBorrowLendOperation()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1506) | :closed_lock_with_key:  | POST | `/exchange (borrowLend)` |
| [claimRewards()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1527) | :closed_lock_with_key:  | POST | `/exchange (claimRewards)` |
| [createSubAccount()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1531) | :closed_lock_with_key:  | POST | `/exchange (createSubAccount)` |
| [createVault()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1538) | :closed_lock_with_key:  | POST | `/exchange (createVault)` |
| [setEvmBigBlocks()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1545) | :closed_lock_with_key:  | POST | `/exchange (evmUserModify)` |
| [finalizeEvmContract()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1552) | :closed_lock_with_key:  | POST | `/exchange (finalizeEvmContract)` |
| [submitGossipPriorityBid()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1565) | :closed_lock_with_key:  | POST | `/exchange (gossipPriorityBid)` |
| [transferHip3LiquidatorFunds()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1578) | :closed_lock_with_key:  | POST | `/exchange (hip3LiquidatorTransfer)` |
| [invalidateNonce()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1588) | :closed_lock_with_key:  | POST | `/exchange (noop)` |
| [deployPerp()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1592) | :closed_lock_with_key:  | POST | `/exchange (perpDeploy)` |
| [deploySpot()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1599) | :closed_lock_with_key:  | POST | `/exchange (spotDeploy)` |
| [reserveAdditionalActions()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1611) | :closed_lock_with_key:  | POST | `/exchange (reserveRequestWeight)` |
| [setDisplayName()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1618) | :closed_lock_with_key:  | POST | `/exchange (setDisplayName)` |
| [setSpotDusting()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1625) | :closed_lock_with_key:  | POST | `/exchange (spotUser)` |
| [renameSubAccount()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1632) | :closed_lock_with_key:  | POST | `/exchange (subAccountModify)` |
| [transferSpotToOrFromSubAccount()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1639) | :closed_lock_with_key:  | POST | `/exchange (subAccountSpotTransfer)` |
| [transferUsdToOrFromSubAccount()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1650) | :closed_lock_with_key:  | POST | `/exchange (subAccountTransfer)` |
| [transferVaultFunds()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1660) | :closed_lock_with_key:  | POST | `/exchange (vaultTransfer)` |
| [distributeVaultFunds()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1667) | :closed_lock_with_key:  | POST | `/exchange (vaultDistribute)` |
| [modifyVault()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1674) | :closed_lock_with_key:  | POST | `/exchange (vaultModify)` |
| [updateValidatorL1Stream()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1698) | :closed_lock_with_key:  | POST | `/exchange (validatorL1Stream)` |
| [submitSignerAction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1709) | :closed_lock_with_key:  | POST | `/exchange (CSignerAction)` |
| [submitValidatorAction()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1716) | :closed_lock_with_key:  | POST | `/exchange (CValidatorAction)` |
| [authorizeAqav2Role()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1729) | :closed_lock_with_key:  | POST | `/exchange (authorizeAqav2Role)` |
| [submitUserOutcome()](https://github.com/sieblyio/hyperliquid-api/blob/main/src/RestClient.ts#L1744) | :closed_lock_with_key:  | POST | `/exchange (userOutcome)` |