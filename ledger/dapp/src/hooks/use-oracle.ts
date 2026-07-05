import { useState, useEffect } from 'react'
import { useReadContract } from 'wagmi'
import { AV_CONTRACTS, CHAINLINK_FEEDS } from '@/lib/constants'

export function useOraclePrices() {
  const [prices, setPrices] = useState<{ [key: string]: number }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 1. Try to fetch from the official AV Oracle
  const { data: oracleData, error: oracleError } = useReadContract({
    address: AV_CONTRACTS.oracle,
    functionName: 'getLatestPrices',
  })

  // 2. Fail-over: Fetch ETH price directly from Chainlink (The Truth)
  const { data: ethPriceData } = useReadContract({
    address: CHAINLINK_FEEDS.ethUsd,
    functionName: 'latestRoundData',
  })

  useEffect(() => {
    async function syncPrices() {
      try {
        setIsLoading(true)
        
        if (oracleData && Array.isArray(oracleData)) {
          // Oracle is working - use its data
          const mappedPrices: { [key: string]: number } = {}
          oracleData.forEach((price, index) => {
            mappedPrices[`token_${index}`] = Number(price) / 1e8
          })
          setPrices(mappedPrices)
        } else if (ethPriceData && Array.isArray(ethPriceData)) {
          // Oracle failed - use Chainlink fail-over
          setPrices({
            eth: Number(ethPriceData[1]) / 1e8,
            au: 1.0, // Fallback to 1:1 or baseline if oracle is dead
            ag: 0.1,
          })
        } else {
          // Total failure - set baseline to prevent UI lock
          setPrices({ eth: 2500, au: 1.0, ag: 0.1 })
        }
        
        setIsLoading(false)
      } catch (err) {
        setError(err as Error)
        setIsLoading(false)
      }
    }

    syncPrices()
  }, [oracleData, ethPriceData])

  return { prices, isLoading, error }
}
