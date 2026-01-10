/**
 * @fileoverview Entity Pricing Page
 * @description Public pricing page for displaying subscription options
 */

import { useState, useCallback } from 'react';
import {
  SubscriptionTile,
  SegmentedControl,
} from '@sudobility/subscription-components';

type BillingPeriod = 'monthly' | 'yearly';

/** Product from subscription provider */
export interface PricingProduct {
  identifier: string;
  title: string;
  price: string;
  priceString: string;
  period?: string;
}

/** FAQ item */
export interface FAQItem {
  question: string;
  answer: string;
}

/** All localized labels for the pricing page */
export interface PricingPageLabels {
  // Header
  title: string;
  subtitle: string;

  // Periods
  periodYear: string;
  periodMonth: string;
  periodWeek: string;

  // Billing period toggle
  billingMonthly: string;
  billingYearly: string;

  // Free tier
  freeTierTitle: string;
  freeTierPrice: string;
  freeTierFeatures: string[];

  // Badges
  currentPlanBadge: string;
  mostPopularBadge: string;

  // CTA buttons
  ctaLogIn: string;
  ctaTryFree: string;
  ctaUpgrade: string;

  // FAQ
  faqTitle: string;
}

/** Formatter functions for dynamic strings */
export interface PricingPageFormatters {
  /** Format savings badge: "Save 20%" */
  formatSavePercent: (percent: number) => string;
  /** Get features for a product by its identifier */
  getProductFeatures: (productId: string) => string[];
}

/** Package ID to entitlement mapping */
export interface EntitlementMap {
  [packageId: string]: string;
}

/** Entitlement to level mapping for comparing plan tiers */
export interface EntitlementLevels {
  [entitlement: string]: number;
}

export interface EntityPricingPageProps {
  /** Available subscription products */
  products: PricingProduct[];
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether user has an active subscription */
  hasActiveSubscription: boolean;
  /** Current subscription product identifier (if any) */
  currentProductIdentifier?: string;
  /** Entity ID used for subscription (the selected entity's ID when logged in) */
  subscriptionUserId?: string;
  /** All localized labels */
  labels: PricingPageLabels;
  /** Formatter functions */
  formatters: PricingPageFormatters;
  /** Package ID to entitlement mapping for calculating savings */
  entitlementMap: EntitlementMap;
  /** Entitlement to level mapping for comparing tiers (higher = better) */
  entitlementLevels: EntitlementLevels;
  /** Called when user clicks on a plan */
  onPlanClick: (planIdentifier: string) => void;
  /** Called when user clicks on free plan */
  onFreePlanClick: () => void;
  /** Optional FAQ items */
  faqItems?: FAQItem[];
  /** Optional className for the container */
  className?: string;
}

/**
 * Public pricing page for displaying subscription options.
 * - Non-authenticated: Free tile shows "Try it for Free", paid tiles show "Log in to Continue"
 * - Authenticated on free: Free tile shows "Current Plan" badge (no CTA), paid tiles show "Upgrade"
 * - Authenticated with subscription: Current plan shows badge (no CTA), higher tiers show "Upgrade"
 */
export function EntityPricingPage({
  products,
  isAuthenticated,
  hasActiveSubscription,
  currentProductIdentifier,
  labels,
  formatters,
  entitlementMap,
  entitlementLevels,
  onPlanClick,
  onFreePlanClick,
  faqItems,
  className,
}: EntityPricingPageProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  // Get entitlement level for a product (0 for free/none)
  const getProductLevel = useCallback(
    (productId: string): number => {
      const entitlement = entitlementMap[productId];
      if (!entitlement) return 0;
      return entitlementLevels[entitlement] ?? 0;
    },
    [entitlementMap, entitlementLevels]
  );

  // Get current user's subscription level
  const currentLevel = currentProductIdentifier
    ? getProductLevel(currentProductIdentifier)
    : 0;

  // Filter products by billing period and sort by price
  const filteredProducts = products
    .filter((product) => {
      if (!product.period) return false;
      const isYearly =
        product.period.includes('Y') || product.period.includes('year');
      return billingPeriod === 'yearly' ? isYearly : !isYearly;
    })
    .sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

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

  const getYearlySavingsPercent = useCallback(
    (yearlyPackageId: string): number | undefined => {
      const yearlyEntitlement = entitlementMap[yearlyPackageId];
      if (!yearlyEntitlement) return undefined;

      const yearlyProduct = products.find(
        (p) => p.identifier === yearlyPackageId
      );
      if (!yearlyProduct) return undefined;

      const monthlyPackageId = Object.entries(entitlementMap).find(
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
    [products, entitlementMap]
  );

  const billingPeriodOptions = [
    { value: 'monthly' as const, label: labels.billingMonthly },
    { value: 'yearly' as const, label: labels.billingYearly },
  ];

  // Determine if a product is the current plan (same entitlement level)
  const isCurrentPlan = useCallback(
    (productId: string): boolean => {
      if (!isAuthenticated) return false;
      if (!hasActiveSubscription) return false;
      // Compare entitlement levels (handles monthly/yearly variants of same tier)
      return getProductLevel(productId) === currentLevel && currentLevel > 0;
    },
    [isAuthenticated, hasActiveSubscription, getProductLevel, currentLevel]
  );

  // Determine if a product is an upgrade from current plan
  const isUpgrade = useCallback(
    (productId: string): boolean => {
      const productLevel = getProductLevel(productId);
      return productLevel > currentLevel;
    },
    [getProductLevel, currentLevel]
  );

  return (
    <div className={className}>
      {/* Header */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-theme-text-primary mb-4">
            {labels.title}
          </h1>
          <p className="text-lg text-theme-text-secondary">{labels.subtitle}</p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Billing Period Selector */}
          <div className="flex justify-center mb-8">
            <SegmentedControl
              options={billingPeriodOptions}
              value={billingPeriod}
              onChange={setBillingPeriod}
            />
          </div>

          {/* Subscription Tiles Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Free Tier */}
            <SubscriptionTile
              id="free"
              title={labels.freeTierTitle}
              price={labels.freeTierPrice}
              periodLabel={labels.periodMonth}
              features={labels.freeTierFeatures}
              isSelected={false}
              onSelect={() => {}}
              topBadge={
                isAuthenticated && !hasActiveSubscription
                  ? {
                      text: labels.currentPlanBadge,
                      color: 'green',
                    }
                  : undefined
              }
              ctaButton={
                // Not logged in: show "Try it for Free"
                // Logged in on free plan: no CTA (current plan)
                // Logged in with subscription: no CTA (can't downgrade here)
                !isAuthenticated
                  ? {
                      label: labels.ctaTryFree,
                      onClick: onFreePlanClick,
                    }
                  : undefined
              }
              hideSelectionIndicator={isAuthenticated}
            />

            {/* Paid Plans */}
            {filteredProducts.map((product) => {
              const isCurrent = isCurrentPlan(product.identifier);
              const canUpgrade = isUpgrade(product.identifier);

              // Determine CTA button
              let ctaButton: { label: string; onClick: () => void } | undefined;
              if (!isAuthenticated) {
                // Not logged in: show "Log in to Continue"
                ctaButton = {
                  label: labels.ctaLogIn,
                  onClick: () => onPlanClick(product.identifier),
                };
              } else if (isCurrent) {
                // Current plan: no CTA
                ctaButton = undefined;
              } else if (canUpgrade) {
                // Higher tier: show "Upgrade"
                ctaButton = {
                  label: labels.ctaUpgrade,
                  onClick: () => onPlanClick(product.identifier),
                };
              }
              // Lower tier than current: no CTA (implicit downgrade not shown)

              // Determine top badge
              let topBadge: { text: string; color: 'purple' | 'green' | 'blue' | 'yellow' | 'red' } | undefined;
              if (isCurrent) {
                topBadge = {
                  text: labels.currentPlanBadge,
                  color: 'green',
                };
              } else if (product.identifier.includes('pro')) {
                topBadge = {
                  text: labels.mostPopularBadge,
                  color: 'yellow',
                };
              }

              return (
                <SubscriptionTile
                  key={product.identifier}
                  id={product.identifier}
                  title={product.title}
                  price={product.priceString}
                  periodLabel={getPeriodLabel(product.period)}
                  features={formatters.getProductFeatures(product.identifier)}
                  isSelected={false}
                  onSelect={() => {}}
                  isBestValue={product.identifier.includes('pro')}
                  topBadge={topBadge}
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
                  ctaButton={ctaButton}
                  hideSelectionIndicator={!ctaButton}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      {faqItems && faqItems.length > 0 && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-theme-bg-secondary">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-theme-text-primary text-center mb-12">
              {labels.faqTitle}
            </h2>

            <div className="space-y-6">
              {faqItems.map((item, index) => (
                <div
                  key={index}
                  className="bg-theme-bg-primary p-6 rounded-xl border border-theme-border"
                >
                  <h3 className="text-lg font-semibold text-theme-text-primary mb-2">
                    {item.question}
                  </h3>
                  <p className="text-theme-text-secondary">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
