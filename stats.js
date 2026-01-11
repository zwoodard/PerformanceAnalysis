/**
 * Statistical Analysis Module
 * Provides functions for performance data analysis including t-tests,
 * descriptive statistics, and effect size calculations.
 */

const Stats = {
    /**
     * Calculate the mean (average) of an array of numbers
     */
    mean: function(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    },

    /**
     * Calculate the variance of an array of numbers
     * Uses Bessel's correction (n-1) for sample variance
     */
    variance: function(arr) {
        if (arr.length < 2) return 0;
        const m = this.mean(arr);
        return arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (arr.length - 1);
    },

    /**
     * Calculate the standard deviation
     */
    stdDev: function(arr) {
        return Math.sqrt(this.variance(arr));
    },

    /**
     * Calculate the standard error of the mean
     */
    standardError: function(arr) {
        return this.stdDev(arr) / Math.sqrt(arr.length);
    },

    /**
     * Calculate the median of an array
     */
    median: function(arr) {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    },

    /**
     * Calculate percentile of an array
     */
    percentile: function(arr, p) {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const index = (p / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        if (lower === upper) return sorted[lower];
        return sorted[lower] + (index - lower) * (sorted[upper] - sorted[lower]);
    },

    /**
     * Calculate quartiles (Q1, Q2/median, Q3)
     */
    quartiles: function(arr) {
        return {
            q1: this.percentile(arr, 25),
            q2: this.median(arr),
            q3: this.percentile(arr, 75)
        };
    },

    /**
     * Calculate the interquartile range
     */
    iqr: function(arr) {
        const q = this.quartiles(arr);
        return q.q3 - q.q1;
    },

    /**
     * Get min and max of an array
     */
    minMax: function(arr) {
        if (arr.length === 0) return { min: 0, max: 0 };
        return {
            min: Math.min(...arr),
            max: Math.max(...arr)
        };
    },

    /**
     * Calculate Cohen's d effect size
     * Measures the standardized difference between two means
     * Small: 0.2, Medium: 0.5, Large: 0.8
     */
    cohensD: function(arr1, arr2) {
        const mean1 = this.mean(arr1);
        const mean2 = this.mean(arr2);
        const n1 = arr1.length;
        const n2 = arr2.length;

        // Pooled standard deviation
        const var1 = this.variance(arr1);
        const var2 = this.variance(arr2);
        const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
        const pooledStd = Math.sqrt(pooledVar);

        if (pooledStd === 0) return 0;
        return (mean1 - mean2) / pooledStd;
    },

    /**
     * Interpret Cohen's d effect size
     */
    interpretCohensD: function(d) {
        const absD = Math.abs(d);
        if (absD < 0.2) return 'negligible';
        if (absD < 0.5) return 'small';
        if (absD < 0.8) return 'medium';
        return 'large';
    },

    /**
     * Calculate Welch's t-statistic for two independent samples
     * More robust than Student's t-test when variances are unequal
     */
    welchTTest: function(arr1, arr2) {
        const n1 = arr1.length;
        const n2 = arr2.length;
        const mean1 = this.mean(arr1);
        const mean2 = this.mean(arr2);
        const var1 = this.variance(arr1);
        const var2 = this.variance(arr2);

        // Welch's t-statistic
        const se = Math.sqrt(var1 / n1 + var2 / n2);
        if (se === 0) return { t: 0, df: n1 + n2 - 2, pValue: 1 };

        const t = (mean1 - mean2) / se;

        // Welch-Satterthwaite degrees of freedom
        const num = Math.pow(var1 / n1 + var2 / n2, 2);
        const denom = Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1);
        const df = num / denom;

        // Calculate two-tailed p-value
        const pValue = this.tDistributionPValue(Math.abs(t), df) * 2;

        return { t, df, pValue: Math.min(pValue, 1) };
    },

    /**
     * Approximate the p-value from t-distribution
     * Uses a polynomial approximation for the cumulative distribution
     */
    tDistributionPValue: function(t, df) {
        // Approximation using the incomplete beta function relationship
        const x = df / (df + t * t);
        return 0.5 * this.incompleteBeta(df / 2, 0.5, x);
    },

    /**
     * Incomplete beta function approximation
     * Used for calculating p-values from t-distribution
     */
    incompleteBeta: function(a, b, x) {
        // Use continued fraction approximation for incomplete beta
        if (x === 0) return 0;
        if (x === 1) return 1;

        // For better convergence, use the complement when x > (a+1)/(a+b+2)
        if (x > (a + 1) / (a + b + 2)) {
            return 1 - this.incompleteBeta(b, a, 1 - x);
        }

        const lnBeta = this.lnGamma(a) + this.lnGamma(b) - this.lnGamma(a + b);
        const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;

        // Continued fraction using Lentz's method
        let f = 1, c = 1, d = 0;
        for (let m = 0; m <= 200; m++) {
            let numerator;
            if (m === 0) {
                numerator = 1;
            } else if (m % 2 === 0) {
                const k = m / 2;
                numerator = (k * (b - k) * x) / ((a + 2 * k - 1) * (a + 2 * k));
            } else {
                const k = (m - 1) / 2;
                numerator = -((a + k) * (a + b + k) * x) / ((a + 2 * k) * (a + 2 * k + 1));
            }

            d = 1 + numerator * d;
            if (Math.abs(d) < 1e-30) d = 1e-30;
            d = 1 / d;

            c = 1 + numerator / c;
            if (Math.abs(c) < 1e-30) c = 1e-30;

            const delta = c * d;
            f *= delta;

            if (Math.abs(delta - 1) < 1e-10) break;
        }

        return front * (f - 1);
    },

    /**
     * Log gamma function approximation (Lanczos approximation)
     */
    lnGamma: function(z) {
        const g = 7;
        const c = [
            0.99999999999980993,
            676.5203681218851,
            -1259.1392167224028,
            771.32342877765313,
            -176.61502916214059,
            12.507343278686905,
            -0.13857109526572012,
            9.9843695780195716e-6,
            1.5056327351493116e-7
        ];

        if (z < 0.5) {
            return Math.log(Math.PI / Math.sin(Math.PI * z)) - this.lnGamma(1 - z);
        }

        z -= 1;
        let x = c[0];
        for (let i = 1; i < g + 2; i++) {
            x += c[i] / (z + i);
        }
        const t = z + g + 0.5;
        return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
    },

    /**
     * Interpret p-value as confidence level
     */
    interpretPValue: function(pValue) {
        if (pValue < 0.001) return { level: 'Very High', confidence: 99.9, description: 'Extremely strong evidence' };
        if (pValue < 0.01) return { level: 'High', confidence: 99, description: 'Strong evidence' };
        if (pValue < 0.05) return { level: 'Moderate', confidence: 95, description: 'Moderate evidence' };
        if (pValue < 0.1) return { level: 'Low', confidence: 90, description: 'Weak evidence' };
        return { level: 'Insufficient', confidence: 0, description: 'No significant evidence' };
    },

    /**
     * Calculate percentage change
     */
    percentageChange: function(before, after) {
        if (before === 0) return 0;
        return ((after - before) / before) * 100;
    },

    /**
     * Get descriptive statistics summary
     */
    describeSample: function(arr) {
        const q = this.quartiles(arr);
        const mm = this.minMax(arr);
        return {
            n: arr.length,
            mean: this.mean(arr),
            median: q.q2,
            stdDev: this.stdDev(arr),
            standardError: this.standardError(arr),
            variance: this.variance(arr),
            min: mm.min,
            max: mm.max,
            range: mm.max - mm.min,
            q1: q.q1,
            q3: q.q3,
            iqr: q.q3 - q.q1
        };
    },

    /**
     * Perform complete analysis comparing before and after samples
     */
    analyze: function(before, after) {
        const beforeStats = this.describeSample(before);
        const afterStats = this.describeSample(after);
        const tTest = this.welchTTest(before, after);
        const cohensD = this.cohensD(before, after);
        const percentChange = this.percentageChange(beforeStats.mean, afterStats.mean);
        const pInterpretation = this.interpretPValue(tTest.pValue);
        const effectInterpretation = this.interpretCohensD(cohensD);

        // Determine if after is faster or slower
        // Negative means after is faster (lower timing)
        const isFaster = afterStats.mean < beforeStats.mean;
        const isSignificant = tTest.pValue < 0.05;

        return {
            before: beforeStats,
            after: afterStats,
            tTest: tTest,
            cohensD: cohensD,
            percentChange: percentChange,
            pInterpretation: pInterpretation,
            effectInterpretation: effectInterpretation,
            isFaster: isFaster,
            isSignificant: isSignificant,
            verdict: isSignificant ? (isFaster ? 'faster' : 'slower') : 'inconclusive'
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Stats;
}
