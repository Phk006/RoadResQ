export type DispatchWeights = { eta: number; distance: number; availability: number; capacity: number; reliability: number; workload: number };
export type DispatchCandidate = { etaMinutes: number; distanceKm: number; fuelAvailabilityRatio: number; deliveryCapacityRatio: number; reliability: number; workloadRatio: number };

export const defaultDispatchWeights: DispatchWeights = { eta: 0.3, distance: 0.2, availability: 0.15, capacity: 0.1, reliability: 0.15, workload: 0.1 };
export function scoreCandidate(candidate: DispatchCandidate, weights: DispatchWeights = defaultDispatchWeights) {
  const eta = 1 - Math.min(candidate.etaMinutes / 120, 1);
  const distance = 1 - Math.min(candidate.distanceKm / 25, 1);
  const workload = 1 - Math.min(Math.max(candidate.workloadRatio, 0), 1);
  return weights.eta * eta + weights.distance * distance + weights.availability * candidate.fuelAvailabilityRatio + weights.capacity * candidate.deliveryCapacityRatio + weights.reliability * candidate.reliability + weights.workload * workload;
}
