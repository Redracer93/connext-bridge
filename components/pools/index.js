import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { BigNumber, utils } from 'ethers'
import { TailSpin } from 'react-loader-spinner'

import Total from './total'
import Pools from './pools'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, name, equals_ignore_case, loader_color } from '../../lib/utils'

const WRAPPED_PREFIX =
  process.env.NEXT_PUBLIC_WRAPPED_PREFIX ||
  'next'

const VIEWS =
  [
    {
      id: 'pools',
      title: 'Pools',
    },
    {
      id: 'my_positions',
      title: 'My positions',
    },
  ]

export default () => {
  const {
    preferences,
    chains,
    pool_assets,
    _pools,
    dev,
    wallet,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
        pool_assets: state.pool_assets,
        _pools: state.pools,
        dev: state.dev,
        wallet: state.wallet,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    chains_data,
  } = { ...chains }
  const {
    pool_assets_data,
  } = { ...pool_assets }
  const {
    pools_data,
  } = { ..._pools }
  const { sdk,
  } = { ...dev }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    address,
  } = { ...wallet_data }

  const [view, setView] =
    useState(
      _.head(VIEWS)?.id
    )
  const [pools, setPools] = useState(null)
  const [poolsTrigger, setPoolsTrigger] = useState(null)

  // get pools
  useEffect(
    () => {
      const getData = async () => {
        if (sdk) {
          if (address) {
            let data

            for (const chain_data of chains_data) {
              try {
                const {
                  chain_id,
                  domain_id,
                } = { ...chain_data }

                const response =
                  await sdk.nxtpSdkPool
                    .getUserPools(
                      domain_id,
                      address,
                    )

                if (Array.isArray(response)) {
                  data =
                    _.concat(
                      data,
                      response
                        .map(p => {
                          const {
                            info,
                            lpTokenBalance,
                            poolTokenBalances,
                          } = { ...p }
                          const {
                            symbol,
                            decimals,
                            balances,
                          } = { ...info }

                          let symbols =
                            (symbol || '')
                              .split('-')
                              .filter(s => s)

                          const asset_data = pool_assets_data
                            .find(a =>
                              symbols.findIndex(s =>
                                equals_ignore_case(
                                  s,
                                  a?.symbol,
                                )
                              ) > -1 ||
                              (a?.contracts || [])
                                .findIndex(c =>
                                  c?.chain_id === chain_id &&
                                  symbols
                                    .findIndex(s =>
                                      equals_ignore_case(
                                        s,
                                        c?.symbol,
                                      )
                                    ) > -1
                                ) > -1
                            )

                          const {
                            contracts,
                          } = { ...asset_data }

                          const contract_data =
                            (contracts || [])
                              .find(c =>
                                c?.chain_id === chain_id
                              )

                          const {
                            next_asset,
                          } = { ...contract_data }

                          if (
                            symbols
                              .findIndex(s =>
                                s?.startsWith(WRAPPED_PREFIX)
                              ) !==
                            (p?.tokens || [])
                              .findIndex(t =>
                                equals_ignore_case(
                                  t,
                                  next_asset?.contract_address,
                                ),
                              )
                          ) {
                            symbols =
                              _.reverse(
                                _.cloneDeep(symbols)
                              )
                          }

                          return {
                            ...p,
                            chain_data,
                            asset_data,
                            ...info,
                            symbols,
                            lpTokenBalance:
                              Number(
                                utils.formatUnits(
                                  BigNumber.from(
                                    lpTokenBalance ||
                                    '0',
                                  ),
                                  // _.last(decimals) ||
                                  18,
                                )
                              ),
                            poolTokenBalances:
                              (poolTokenBalances || [])
                                .map((b, i) =>
                                  Number(
                                    utils.formatUnits(
                                      BigNumber.from(
                                        b ||
                                        '0',
                                      ),
                                      decimals?.[i] ||
                                      18,
                                    )
                                  )
                                ),
                            balances:
                              (balances || p?.balances || [])
                                .map((b, i) =>
                                  typeof b === 'number' ?
                                    b :
                                    Number(
                                      utils.formatUnits(
                                        BigNumber.from(
                                          b ||
                                          '0',
                                        ),
                                        decimals?.[i] ||
                                        18,
                                      )
                                    )
                                ),
                          }
                        }),
                    )
                    .filter(d => d)
                }
              } catch (error) {}
            }

            setPools(
              data ||
              pools ||
              []
            )
          }
          else {
            setPools([])
          }
        }
      }

      getData()
    },
    [sdk, address, poolsTrigger],
  )

  return (
    <div className="mb-4">
      <div className="flex justify-center">
        <div className="w-full flex flex-col space-y-4 sm:space-y-8 my-4 sm:my-12 mx-1 sm:mx-4">
          <div className="grid sm:grid-cols-1 gap-4">
            <div className="flex flex-col space-y-6 sm:space-y-12">
              <h1 className="tracking-tighter text-xl sm:text-5xl font-semibold">
                Add liquidity to earn rewards.
              </h1>
              <div className="border-0 dark:border-slate-800 flex items-center">
                {VIEWS
                  .map((v, i) => (
                    <div
                      key={i}
                      onClick={() => setView(v.id)}
                      className={`border-b-4 ${view === v.id ? 'border-slate-600 dark:border-white font-semibold' : 'border-transparent text-slate-400 dark:text-slate-500 font-medium'} whitespace-nowrap cursor-pointer text-lg mr-2 p-2`}
                    >
                      {v.title}
                    </div>
                  ))
                }
                {
                  view === 'pools' &&
                  pool_assets_data &&
                  pools_data &&
                  pools_data.length <
                  pool_assets_data
                    .flatMap(p =>
                      (p?.contracts || [])
                        .filter(c =>
                          c?.is_pool
                        )
                    )
                    .length &&
                  (
                    <div className="flex items-center space-x-2 ml-auto">
                      <TailSpin
                        color={loader_color(theme)}
                        width="18"
                        height="18"
                      />
                      <div className="flex items-center text-xs font-medium">
                        <span>
                          Loading ...
                        </span>
                        <span className="hidden sm:block ml-1">
                          Please wait
                        </span>
                      </div>
                    </div>
                  )
                }
              </div>
            </div>
            {
              false &&
              view === 'pools' &&
              (
                <Total />
              )
            }
          </div>
          <Pools
            view={view}
            user_pools_data={pools}
          />
        </div>
      </div>
    </div>
  )
}