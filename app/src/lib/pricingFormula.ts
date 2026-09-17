import type { PricingComponents } from '@/mock/pricing/types'

export interface FatFactors {
  cannibalisationPct: number // e.g. -0.18
  volumeRiskPct: number // e.g. -0.05
  marginPct: number // e.g. -0.045
  marginOffset: number // e.g. 0.15
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function computeFatRow(baseload: number, factors: FatFactors, curtailmentPct: number): {
  withCurtailment: PricingComponents
  withoutCurtailment: PricingComponents
} {
  const build = (cannPct: number): PricingComponents => {
    const cannibalisation = round2(baseload * cannPct)
    const volumeRisk = round2(baseload * factors.volumeRiskPct)
    const margin = round2(baseload * factors.marginPct + factors.marginOffset)
    const seasonal = 0
    const balancingFee = 0
    const power = round2(baseload + seasonal + cannibalisation + volumeRisk + margin)
    return { baseload, seasonal, cannibalisation, volumeRisk, margin, balancingFee, power }
  }

  const cannPctWith = factors.cannibalisationPct - curtailmentPct * 0.3
  const cannPctWithout = factors.cannibalisationPct

  return {
    withCurtailment: build(cannPctWith),
    withoutCurtailment: build(cannPctWithout),
  }
}

export function flatBalancingComponents(fee: number): PricingComponents {
  return { baseload: 0, seasonal: 0, cannibalisation: 0, volumeRisk: 0, margin: 0, balancingFee: fee, power: fee }
}
