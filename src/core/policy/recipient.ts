/**
 * Recipient classification — effective classification for channel+recipient pairs.
 *
 * Determines the effective classification level by taking the minimum
 * (most restrictive) of the channel level and recipient level. This
 * ensures data never flows to a context less restrictive than either
 * party's classification.
 *
 * @module
 */

import type { ClassificationLevel } from "../types/classification.ts";
import { CLASSIFICATION_ORDER } from "../types/classification.ts";

/**
 * Compute the effective classification for a channel-recipient pair.
 *
 * Returns the minimum (most restrictive) of the channel classification
 * and the recipient classification. Classification ordering from most
 * to least restrictive: RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC.
 *
 * The effective classification ensures the no-write-down rule is
 * respected for both the channel and the recipient.
 *
 * @param channelLevel - The classification level of the channel
 * @param recipientLevel - The classification level of the recipient
 * @returns The more restrictive of the two classification levels
 */
export function effectiveClassification(
  channelLevel: ClassificationLevel,
  recipientLevel: ClassificationLevel,
): ClassificationLevel {
  return CLASSIFICATION_ORDER[channelLevel] <=
      CLASSIFICATION_ORDER[recipientLevel]
    ? channelLevel
    : recipientLevel;
}
