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

/** Translation function type */
export type TranslationFunction = (
  key: string,
  defaultValueOrOptions?: string | Record<string, unknown>,
  options?: Record<string, unknown>
) => string;

export interface EntitySubscriptionsPageProps {
  /** Subscription context value */
  subscription: SubscriptionContextValue;
  /** Rate limit configuration */
  rateLimitsConfig?: RateLimitsConfigData | null;
  /** Translation function */
  t: TranslationFunction;
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
  t,
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
      onError?.(t('common.error'), error);
      clearError();
    }
  }, [error, clearError, t, onError]);

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
        t('common.error'),
        err instanceof Error ? err.message : t('purchase.error')
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
        onWarning?.(t('common.error'), t('restore.noPurchases'));
      }
    } catch (err) {
      onError?.(
        t('common.error'),
        err instanceof Error ? err.message : t('restore.error')
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
        return t('periods.year');
      if (period.includes('M') || period.includes('month'))
        return t('periods.month');
      if (period.includes('W') || period.includes('week'))
        return t('periods.week');
      return '';
    },
    [t]
  );

  const getTrialLabel = useCallback(
    (trialPeriod?: string) => {
      if (!trialPeriod) return undefined;
      const num = trialPeriod.replace(/\D/g, '') || '1';
      if (trialPeriod.includes('W')) {
        return t('trial.weeks', { count: parseInt(num, 10) });
      }
      if (trialPeriod.includes('M')) {
        return t('trial.months', { count: parseInt(num, 10) });
      }
      return t('trial.days', { count: parseInt(num, 10) });
    },
    [t]
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
      if (limit === null) return t('rateLimits.unlimited', 'Unlimited');
      return limit.toLocaleString();
    },
    [t]
  );

  const getRateLimitFeatures = useCallback(
    (packageId: string): string[] => {
      const tier = getRateLimitTierForProduct(packageId);
      if (!tier) return [];

      const features: string[] = [];

      if (tier.limits.hourly !== null) {
        features.push(
          t('rateLimits.hourly', '{{limit}} requests/hour', {
            limit: formatRateLimit(tier.limits.hourly),
          })
        );
      }
      if (tier.limits.daily !== null) {
        features.push(
          t('rateLimits.daily', '{{limit}} requests/day', {
            limit: formatRateLimit(tier.limits.daily),
          })
        );
      }
      if (tier.limits.monthly !== null) {
        features.push(
          t('rateLimits.monthly', '{{limit}} requests/month', {
            limit: formatRateLimit(tier.limits.monthly),
          })
        );
      }

      if (
        tier.limits.hourly === null &&
        tier.limits.daily === null &&
        tier.limits.monthly === null
      ) {
        features.push(
          t('rateLimits.unlimitedRequests', 'Unlimited API requests')
        );
      }

      return features;
    },
    [getRateLimitTierForProduct, formatRateLimit, t]
  );

  const getProductFeatures = useCallback(
    (packageId: string): string[] => {
      return getRateLimitFeatures(packageId);
    },
    [getRateLimitFeatures]
  );

  const getFreeTierFeatures = useCallback((): string[] => {
    const benefits = [
      t('freeTier.schemaValidation', 'JSON Schema-validated outputs'),
      t(
        'freeTier.allProviders',
        'All LLM providers (OpenAI, Anthropic, Google)'
      ),
      t('freeTier.endpointTesting', 'Built-in endpoint testing'),
      t('freeTier.analytics', 'Basic usage analytics'),
    ];

    if (rateLimitsConfig?.tiers) {
      const freeTier = rateLimitsConfig.tiers.find(
        (tier) => tier.entitlement === 'none'
      );
      if (freeTier) {
        if (freeTier.limits.hourly !== null) {
          benefits.push(
            t('rateLimits.hourly', '{{limit}} requests/hour', {
              limit: formatRateLimit(freeTier.limits.hourly),
            })
          );
        }
        if (freeTier.limits.daily !== null) {
          benefits.push(
            t('rateLimits.daily', '{{limit}} requests/day', {
              limit: formatRateLimit(freeTier.limits.daily),
            })
          );
        }
        if (freeTier.limits.monthly !== null) {
          benefits.push(
            t('rateLimits.monthly', '{{limit}} requests/month', {
              limit: formatRateLimit(freeTier.limits.monthly),
            })
          );
        }
      }
    }

    return benefits;
  }, [rateLimitsConfig, formatRateLimit, t]);

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
    { value: 'monthly' as const, label: t('billingPeriod.monthly') },
    { value: 'yearly' as const, label: t('billingPeriod.yearly') },
  ];

  return (
    <SubscriptionLayout
      title={t('title')}
      error={error}
      currentStatusLabel={t('currentStatus.label')}
      currentStatus={{
        isActive: currentSubscription?.isActive ?? false,
        activeContent: currentSubscription?.isActive
          ? {
              title: t('currentStatus.active'),
              fields: [
                {
                  label: t('currentStatus.plan'),
                  value:
                    currentSubscription.productIdentifier ||
                    t('currentStatus.premium'),
                },
                {
                  label: t('currentStatus.expires'),
                  value: formatExpirationDate(
                    currentSubscription.expirationDate
                  ),
                },
                {
                  label: t('currentStatus.willRenew'),
                  value: currentSubscription.willRenew
                    ? t('common.yes')
                    : t('common.no'),
                },
                ...(rateLimitsConfig
                  ? [
                      {
                        label: t('currentStatus.monthlyUsage', 'Monthly Usage'),
                        value: `${rateLimitsConfig.currentUsage.monthly.toLocaleString()} / ${formatRateLimit(rateLimitsConfig.currentLimits.monthly)}`,
                      },
                      {
                        label: t('currentStatus.dailyUsage', 'Daily Usage'),
                        value: `${rateLimitsConfig.currentUsage.daily.toLocaleString()} / ${formatRateLimit(rateLimitsConfig.currentLimits.daily)}`,
                      },
                    ]
                  : []),
              ],
            }
          : undefined,
        inactiveContent: !currentSubscription?.isActive
          ? {
              title: t('currentStatus.inactive'),
              message: t('currentStatus.inactiveMessage'),
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
        label: isPurchasing ? t('buttons.purchasing') : t('buttons.subscribe'),
        onClick: handlePurchase,
        disabled: !selectedPlan || isPurchasing || isRestoring,
        loading: isPurchasing,
      }}
      secondaryAction={{
        label: isRestoring ? t('buttons.restoring') : t('buttons.restore'),
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
          {t('noProducts')}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-theme-text-secondary">
          {t('noProductsForPeriod')}
        </div>
      ) : (
        <>
          {/* Free tier tile */}
          <SubscriptionTile
            key="free"
            id="free"
            title={t('freeTier.title')}
            price={t('freeTier.price')}
            periodLabel={t('periods.month')}
            features={getFreeTierFeatures()}
            isSelected={!currentSubscription?.isActive && selectedPlan === null}
            onSelect={() => setSelectedPlan(null)}
            topBadge={
              !currentSubscription?.isActive
                ? {
                    text: t('badges.currentPlan', 'Current Plan'),
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
                            text: t('badges.savePercent', 'Save {{percent}}%', {
                              percent: savings,
                            }),
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
                    ? t('intro.note', { price: product.introPrice })
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
