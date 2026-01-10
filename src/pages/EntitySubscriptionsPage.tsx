/**
 * @fileoverview Entity Subscriptions Page
 * @description Page for managing entity subscriptions and viewing rate limits
 */

import { useState, useEffect, useCallback } from 'react';
import {
  SubscriptionLayout,
  SubscriptionTile,
  SegmentedControl,
} from '@sudobility/subscription-components';
import type { RateLimitsConfigData, RateLimitTier } from '@sudobility/types';

type BillingPeriod = 'monthly' | 'yearly';

/** Product from subscription provider */
export interface SubscriptionProduct {
  identifier: string;
  title: string;
  price: string;
  priceString: string;
  period?: string;
  freeTrialPeriod?: string;
  introPrice?: string;
}

/** Current subscription state */
export interface CurrentSubscription {
  isActive: boolean;
  productIdentifier?: string;
  expirationDate?: Date;
  willRenew?: boolean;
}

/** Subscription context value passed from consumer */
export interface SubscriptionContextValue {
  products: SubscriptionProduct[];
  currentSubscription: CurrentSubscription | null;
  isLoading: boolean;
  error: string | null;
  purchase: (productId: string) => Promise<boolean>;
  restore: () => Promise<boolean>;
  clearError: () => void;
}

/** All localized labels for the subscription page */
export interface SubscriptionPageLabels {
  title: string;
  errorTitle: string;
  purchaseError: string;
  restoreError: string;
  restoreNoPurchases: string;

  // Periods
  periodYear: string;
  periodMonth: string;
  periodWeek: string;

  // Billing period toggle
  billingMonthly: string;
  billingYearly: string;

  // Rate limits
  unlimited: string;
  unlimitedRequests: string;

  // Current status
  currentStatusLabel: string;
  statusActive: string;
  statusInactive: string;
  statusInactiveMessage: string;
  labelPlan: string;
  labelPremium: string;
  labelExpires: string;
  labelWillRenew: string;
  labelMonthlyUsage: string;
  labelDailyUsage: string;
  yes: string;
  no: string;

  // Buttons
  buttonSubscribe: string;
  buttonPurchasing: string;
  buttonRestore: string;
  buttonRestoring: string;

  // Empty states
  noProducts: string;
  noProductsForPeriod: string;

  // Free tier
  freeTierTitle: string;
  freeTierPrice: string;
  freeTierFeatures: string[];

  // Badges
  currentPlanBadge: string;
}

/** Formatter functions for dynamic strings */
export interface SubscriptionPageFormatters {
  /** Format rate limit: "1,000 requests/hour" */
  formatHourlyLimit: (limit: string) => string;
  /** Format rate limit: "10,000 requests/day" */
  formatDailyLimit: (limit: string) => string;
  /** Format rate limit: "100,000 requests/month" */
  formatMonthlyLimit: (limit: string) => string;
  /** Format trial period: "7 days free trial" */
  formatTrialDays: (count: number) => string;
  /** Format trial period: "2 weeks free trial" */
  formatTrialWeeks: (count: number) => string;
  /** Format trial period: "1 month free trial" */
  formatTrialMonths: (count: number) => string;
  /** Format savings badge: "Save 20%" */
  formatSavePercent: (percent: number) => string;
  /** Format intro price note */
  formatIntroNote: (price: string) => string;
}

export interface EntitySubscriptionsPageProps {
  /** Subscription context value */
  subscription: SubscriptionContextValue;
  /** Rate limit configuration */
  rateLimitsConfig?: RateLimitsConfigData | null;
  /** Entity ID used for subscription (the selected entity's ID when logged in) */
  subscriptionUserId?: string;
  /** All localized labels */
  labels: SubscriptionPageLabels;
  /** Formatter functions for dynamic strings */
  formatters: SubscriptionPageFormatters;
  /** Called when purchase succeeds */
  onPurchaseSuccess?: () => void;
  /** Called when restore succeeds */
  onRestoreSuccess?: () => void;
  /** Called on error */
  onError?: (title: string, message: string) => void;
  /** Called on warning */
  onWarning?: (title: string, message: string) => void;
}

// Package ID to entitlement mapping (from RevenueCat configuration)
const PACKAGE_ENTITLEMENT_MAP: Record<string, string> = {
  ultra_yearly: 'bandwidth_ultra',
  ultra_monthly: 'bandwidth_ultra',
  pro_yearly: 'bandwidth_pro',
  pro_monthly: 'bandwidth_pro',
  dev_yearly: 'bandwidth_dev',
  dev_monthly: 'bandwidth_dev',
};

/**
 * Page for managing entity subscriptions.
 */
export function EntitySubscriptionsPage({
  subscription,
  rateLimitsConfig,
  labels,
  formatters,
  onPurchaseSuccess,
  onRestoreSuccess,
  onError,
  onWarning,
}: EntitySubscriptionsPageProps) {
  const {
    products,
    currentSubscription,
    isLoading,
    error,
    purchase,
    restore,
    clearError,
  } = subscription;

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Show error via callback
  useEffect(() => {
    if (error) {
      onError?.(labels.errorTitle, error);
      clearError();
    }
  }, [error, clearError, labels.errorTitle, onError]);

  // Filter products by billing period and sort by price
  const filteredProducts = products
    .filter((product) => {
      if (!product.period) return false;
      const isYearly =
        product.period.includes('Y') || product.period.includes('year');
      return billingPeriod === 'yearly' ? isYearly : !isYearly;
    })
    .sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

  const handlePeriodChange = (period: BillingPeriod) => {
    setBillingPeriod(period);
    setSelectedPlan(null);
  };

  const handlePurchase = async () => {
    if (!selectedPlan) return;

    setIsPurchasing(true);
    clearError();

    try {
      const result = await purchase(selectedPlan);
      if (result) {
        onPurchaseSuccess?.();
        setSelectedPlan(null);
      }
    } catch (err) {
      onError?.(
        labels.errorTitle,
        err instanceof Error ? err.message : labels.purchaseError
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    clearError();

    try {
      const result = await restore();
      if (result) {
        onRestoreSuccess?.();
      } else {
        onWarning?.(labels.errorTitle, labels.restoreNoPurchases);
      }
    } catch (err) {
      onError?.(
        labels.errorTitle,
        err instanceof Error ? err.message : labels.restoreError
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const formatExpirationDate = useCallback((date?: Date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }, []);

  const getPeriodLabel = useCallback(
    (period?: string) => {
      if (!period) return '';
      if (period.includes('Y') || period.includes('year'))
        return labels.periodYear;
      if (period.includes('M') || period.includes('month'))
        return labels.periodMonth;
      if (period.includes('W') || period.includes('week'))
        return labels.periodWeek;
      return '';
    },
    [labels]
  );

  const getTrialLabel = useCallback(
    (trialPeriod?: string) => {
      if (!trialPeriod) return undefined;
      const num = parseInt(trialPeriod.replace(/\D/g, '') || '1', 10);
      if (trialPeriod.includes('W')) {
        return formatters.formatTrialWeeks(num);
      }
      if (trialPeriod.includes('M')) {
        return formatters.formatTrialMonths(num);
      }
      return formatters.formatTrialDays(num);
    },
    [formatters]
  );

  const getRateLimitTierForProduct = useCallback(
    (packageId: string): RateLimitTier | undefined => {
      if (!rateLimitsConfig?.tiers) return undefined;

      const entitlement = PACKAGE_ENTITLEMENT_MAP[packageId];
      if (entitlement) {
        return rateLimitsConfig.tiers.find(
          (tier) => tier.entitlement === entitlement
        );
      }

      return rateLimitsConfig.tiers.find((tier) => tier.entitlement === 'none');
    },
    [rateLimitsConfig]
  );

  const formatRateLimit = useCallback(
    (limit: number | null): string => {
      if (limit === null) return labels.unlimited;
      return limit.toLocaleString();
    },
    [labels.unlimited]
  );

  const getRateLimitFeatures = useCallback(
    (packageId: string): string[] => {
      const tier = getRateLimitTierForProduct(packageId);
      if (!tier) return [];

      const features: string[] = [];

      if (tier.limits.hourly !== null) {
        features.push(
          formatters.formatHourlyLimit(formatRateLimit(tier.limits.hourly))
        );
      }
      if (tier.limits.daily !== null) {
        features.push(
          formatters.formatDailyLimit(formatRateLimit(tier.limits.daily))
        );
      }
      if (tier.limits.monthly !== null) {
        features.push(
          formatters.formatMonthlyLimit(formatRateLimit(tier.limits.monthly))
        );
      }

      if (
        tier.limits.hourly === null &&
        tier.limits.daily === null &&
        tier.limits.monthly === null
      ) {
        features.push(labels.unlimitedRequests);
      }

      return features;
    },
    [getRateLimitTierForProduct, formatRateLimit, formatters, labels.unlimitedRequests]
  );

  const getProductFeatures = useCallback(
    (packageId: string): string[] => {
      return getRateLimitFeatures(packageId);
    },
    [getRateLimitFeatures]
  );

  const getFreeTierFeatures = useCallback((): string[] => {
    const benefits = [...labels.freeTierFeatures];

    if (rateLimitsConfig?.tiers) {
      const freeTier = rateLimitsConfig.tiers.find(
        (tier) => tier.entitlement === 'none'
      );
      if (freeTier) {
        if (freeTier.limits.hourly !== null) {
          benefits.push(
            formatters.formatHourlyLimit(formatRateLimit(freeTier.limits.hourly))
          );
        }
        if (freeTier.limits.daily !== null) {
          benefits.push(
            formatters.formatDailyLimit(formatRateLimit(freeTier.limits.daily))
          );
        }
        if (freeTier.limits.monthly !== null) {
          benefits.push(
            formatters.formatMonthlyLimit(formatRateLimit(freeTier.limits.monthly))
          );
        }
      }
    }

    return benefits;
  }, [rateLimitsConfig, formatRateLimit, formatters, labels.freeTierFeatures]);

  const getYearlySavingsPercent = useCallback(
    (yearlyPackageId: string): number | undefined => {
      const yearlyEntitlement = PACKAGE_ENTITLEMENT_MAP[yearlyPackageId];
      if (!yearlyEntitlement) return undefined;

      const yearlyProduct = products.find(
        (p) => p.identifier === yearlyPackageId
      );
      if (!yearlyProduct) return undefined;

      const monthlyPackageId = Object.entries(PACKAGE_ENTITLEMENT_MAP).find(
        ([pkgId, ent]) => ent === yearlyEntitlement && pkgId.includes('monthly')
      )?.[0];
      if (!monthlyPackageId) return undefined;

      const monthlyProduct = products.find(
        (p) => p.identifier === monthlyPackageId
      );
      if (!monthlyProduct) return undefined;

      const yearlyPrice = parseFloat(yearlyProduct.price);
      const monthlyPrice = parseFloat(monthlyProduct.price);

      if (monthlyPrice <= 0 || yearlyPrice <= 0) return undefined;

      const annualizedMonthly = monthlyPrice * 12;
      const savings =
        ((annualizedMonthly - yearlyPrice) / annualizedMonthly) * 100;

      return Math.round(savings);
    },
    [products]
  );

  const billingPeriodOptions = [
    { value: 'monthly' as const, label: labels.billingMonthly },
    { value: 'yearly' as const, label: labels.billingYearly },
  ];

  return (
    <SubscriptionLayout
      title={labels.title}
      error={error}
      currentStatusLabel={labels.currentStatusLabel}
      currentStatus={{
        isActive: currentSubscription?.isActive ?? false,
        activeContent: currentSubscription?.isActive
          ? {
              title: labels.statusActive,
              fields: [
                {
                  label: labels.labelPlan,
                  value:
                    currentSubscription.productIdentifier ||
                    labels.labelPremium,
                },
                {
                  label: labels.labelExpires,
                  value: formatExpirationDate(
                    currentSubscription.expirationDate
                  ),
                },
                {
                  label: labels.labelWillRenew,
                  value: currentSubscription.willRenew
                    ? labels.yes
                    : labels.no,
                },
                ...(rateLimitsConfig
                  ? [
                      {
                        label: labels.labelMonthlyUsage,
                        value: `${rateLimitsConfig.currentUsage.monthly.toLocaleString()} / ${formatRateLimit(rateLimitsConfig.currentLimits.monthly)}`,
                      },
                      {
                        label: labels.labelDailyUsage,
                        value: `${rateLimitsConfig.currentUsage.daily.toLocaleString()} / ${formatRateLimit(rateLimitsConfig.currentLimits.daily)}`,
                      },
                    ]
                  : []),
              ],
            }
          : undefined,
        inactiveContent: !currentSubscription?.isActive
          ? {
              title: labels.statusInactive,
              message: labels.statusInactiveMessage,
            }
          : undefined,
      }}
      aboveProducts={
        !isLoading && products.length > 0 ? (
          <div className="flex justify-center mb-6">
            <SegmentedControl
              options={billingPeriodOptions}
              value={billingPeriod}
              onChange={handlePeriodChange}
            />
          </div>
        ) : null
      }
      primaryAction={{
        label: isPurchasing ? labels.buttonPurchasing : labels.buttonSubscribe,
        onClick: handlePurchase,
        disabled: !selectedPlan || isPurchasing || isRestoring,
        loading: isPurchasing,
      }}
      secondaryAction={{
        label: isRestoring ? labels.buttonRestoring : labels.buttonRestore,
        onClick: handleRestore,
        disabled: isPurchasing || isRestoring,
        loading: isRestoring,
      }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-theme-text-secondary">
          {labels.noProducts}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-theme-text-secondary">
          {labels.noProductsForPeriod}
        </div>
      ) : (
        <>
          {/* Free tier tile */}
          <SubscriptionTile
            key="free"
            id="free"
            title={labels.freeTierTitle}
            price={labels.freeTierPrice}
            periodLabel={labels.periodMonth}
            features={getFreeTierFeatures()}
            isSelected={!currentSubscription?.isActive && selectedPlan === null}
            onSelect={() => setSelectedPlan(null)}
            topBadge={
              !currentSubscription?.isActive
                ? {
                    text: labels.currentPlanBadge,
                    color: 'green',
                  }
                : undefined
            }
            disabled={isPurchasing || isRestoring}
            hideSelectionIndicator
          />
          {/* Paid plans */}
          {filteredProducts.map((product) => (
            <SubscriptionTile
              key={product.identifier}
              id={product.identifier}
              title={product.title}
              price={product.priceString}
              periodLabel={getPeriodLabel(product.period)}
              features={getProductFeatures(product.identifier)}
              isSelected={selectedPlan === product.identifier}
              onSelect={() => setSelectedPlan(product.identifier)}
              isBestValue={product.identifier.includes('pro')}
              discountBadge={
                product.period?.includes('Y')
                  ? (() => {
                      const savings = getYearlySavingsPercent(
                        product.identifier
                      );
                      return savings && savings > 0
                        ? {
                            text: formatters.formatSavePercent(savings),
                            isBestValue: true,
                          }
                        : undefined;
                    })()
                  : undefined
              }
              introPriceNote={
                product.freeTrialPeriod
                  ? getTrialLabel(product.freeTrialPeriod)
                  : product.introPrice
                    ? formatters.formatIntroNote(product.introPrice)
                    : undefined
              }
              disabled={isPurchasing || isRestoring}
            />
          ))}
        </>
      )}
    </SubscriptionLayout>
  );
}
