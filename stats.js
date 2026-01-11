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
    },

    // ==========================================
    // Multi-Variate Analysis Functions
    // ==========================================

    /**
     * Analyze multi-variate data to estimate treatment effects
     * Uses pairwise comparison to isolate individual treatment effects
     * @param {Array} groups - Array of {name, treatments: {treatmentName: bool}, data: [numbers]}
     * @param {Array} treatmentNames - Array of treatment names
     */
    analyzeMultiVariate: function(groups, treatmentNames) {
        const results = {
            groups: [],
            treatments: [],
            baseline: null,
            overallMean: 0
        };

        // Calculate stats for each group
        let allData = [];
        const groupStats = [];
        groups.forEach(group => {
            const stats = this.describeSample(group.data);
            const groupInfo = {
                name: group.name,
                treatments: group.treatments,
                stats: stats,
                treatmentSignature: treatmentNames.map(t => group.treatments[t] ? '1' : '0').join('')
            };
            results.groups.push(groupInfo);
            groupStats.push(groupInfo);
            allData = allData.concat(group.data);
        });

        results.overallMean = this.mean(allData);

        // Find baseline (group with no treatments or fewest treatments)
        let baselineGroup = null;
        let minTreatments = Infinity;
        groups.forEach((group, idx) => {
            const treatmentCount = Object.values(group.treatments).filter(v => v).length;
            if (treatmentCount < minTreatments) {
                minTreatments = treatmentCount;
                baselineGroup = idx;
            }
        });

        if (baselineGroup !== null) {
            results.baseline = results.groups[baselineGroup];
        }

        // Estimate effect of each treatment using pairwise comparison
        // Find pairs of groups that differ by exactly one treatment
        treatmentNames.forEach(treatmentName => {
            const pairwiseEffects = [];

            // Look for pairs where only this treatment differs
            for (let i = 0; i < groupStats.length; i++) {
                for (let j = 0; j < groupStats.length; j++) {
                    if (i === j) continue;

                    const g1 = groupStats[i];
                    const g2 = groupStats[j];

                    // Check if g2 has treatment and g1 doesn't, and all other treatments are the same
                    if (!g1.treatments[treatmentName] && g2.treatments[treatmentName]) {
                        let otherTreatmentsSame = true;
                        for (const t of treatmentNames) {
                            if (t !== treatmentName && g1.treatments[t] !== g2.treatments[t]) {
                                otherTreatmentsSame = false;
                                break;
                            }
                        }

                        if (otherTreatmentsSame) {
                            // Found a valid pair! g1 is "without", g2 is "with"
                            const effect = g2.stats.mean - g1.stats.mean;
                            const percentEffect = this.percentageChange(g1.stats.mean, g2.stats.mean);
                            pairwiseEffects.push({
                                withoutGroup: g1.name,
                                withGroup: g2.name,
                                effect: effect,
                                percentEffect: percentEffect,
                                withoutMean: g1.stats.mean,
                                withMean: g2.stats.mean,
                                withoutData: groups[i].data,
                                withData: groups[j].data
                            });
                        }
                    }
                }
            }

            if (pairwiseEffects.length > 0) {
                // Average the pairwise effects if multiple pairs found
                const avgEffect = this.mean(pairwiseEffects.map(p => p.effect));
                const avgPercentEffect = this.mean(pairwiseEffects.map(p => p.percentEffect));

                // Combine data from all valid pairs for statistical test
                const allWithData = [];
                const allWithoutData = [];
                pairwiseEffects.forEach(p => {
                    allWithData.push(...p.withData);
                    allWithoutData.push(...p.withoutData);
                });

                const tTest = this.welchTTest(allWithoutData, allWithData);

                results.treatments.push({
                    name: treatmentName,
                    effect: avgEffect,
                    percentEffect: avgPercentEffect,
                    withMean: this.mean(allWithData),
                    withoutMean: this.mean(allWithoutData),
                    withN: allWithData.length,
                    withoutN: allWithoutData.length,
                    pValue: tTest.pValue,
                    isSignificant: tTest.pValue < 0.05,
                    interpretation: this.interpretPValue(tTest.pValue),
                    pairCount: pairwiseEffects.length,
                    method: 'pairwise'
                });
            } else {
                // Fallback to marginal comparison (less accurate, will trigger warning)
                const withTreatment = [];
                const withoutTreatment = [];

                groups.forEach(group => {
                    if (group.treatments[treatmentName]) {
                        withTreatment.push(...group.data);
                    } else {
                        withoutTreatment.push(...group.data);
                    }
                });

                if (withTreatment.length >= 2 && withoutTreatment.length >= 2) {
                    const withMean = this.mean(withTreatment);
                    const withoutMean = this.mean(withoutTreatment);
                    const effect = withMean - withoutMean;
                    const percentEffect = this.percentageChange(withoutMean, withMean);
                    const tTest = this.welchTTest(withoutTreatment, withTreatment);

                    results.treatments.push({
                        name: treatmentName,
                        effect: effect,
                        percentEffect: percentEffect,
                        withMean: withMean,
                        withoutMean: withoutMean,
                        withN: withTreatment.length,
                        withoutN: withoutTreatment.length,
                        pValue: tTest.pValue,
                        isSignificant: tTest.pValue < 0.05,
                        interpretation: this.interpretPValue(tTest.pValue),
                        method: 'marginal',
                        confounded: true
                    });
                } else {
                    results.treatments.push({
                        name: treatmentName,
                        effect: null,
                        percentEffect: null,
                        insufficient: true,
                        withN: withTreatment.length,
                        withoutN: withoutTreatment.length
                    });
                }
            }
        });

        return results;
    },

    // ==========================================
    // Time Complexity Fitting Functions
    // ==========================================

    /**
     * Complexity class definitions
     */
    complexityClasses: {
        'O(1)': {
            name: 'O(1)',
            label: 'Constant',
            transform: (n) => 1,
            color: '#10b981'
        },
        'O(log n)': {
            name: 'O(log n)',
            label: 'Logarithmic',
            transform: (n) => Math.log(n),
            color: '#3b82f6'
        },
        'O(n)': {
            name: 'O(n)',
            label: 'Linear',
            transform: (n) => n,
            color: '#8b5cf6'
        },
        'O(n log n)': {
            name: 'O(n log n)',
            label: 'Linearithmic',
            transform: (n) => n * Math.log(n),
            color: '#f59e0b'
        },
        'O(n²)': {
            name: 'O(n²)',
            label: 'Quadratic',
            transform: (n) => n * n,
            color: '#ef4444'
        },
        'O(n³)': {
            name: 'O(n³)',
            label: 'Cubic',
            transform: (n) => n * n * n,
            color: '#ec4899'
        },
        'O(2ⁿ)': {
            name: 'O(2ⁿ)',
            label: 'Exponential',
            transform: (n) => Math.pow(2, n),
            color: '#6366f1'
        }
    },

    /**
     * Simple linear regression
     * @returns {Object} {slope, intercept, rSquared}
     */
    linearRegression: function(xValues, yValues) {
        const n = xValues.length;
        if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };

        const sumX = xValues.reduce((a, b) => a + b, 0);
        const sumY = yValues.reduce((a, b) => a + b, 0);
        const sumXY = xValues.reduce((total, x, i) => total + x * yValues[i], 0);
        const sumX2 = xValues.reduce((total, x) => total + x * x, 0);
        const sumY2 = yValues.reduce((total, y) => total + y * y, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Calculate R-squared
        const yMean = sumY / n;
        const ssTotal = yValues.reduce((total, y) => total + Math.pow(y - yMean, 2), 0);
        const ssResidual = yValues.reduce((total, y, i) => {
            const predicted = slope * xValues[i] + intercept;
            return total + Math.pow(y - predicted, 2);
        }, 0);

        const rSquared = ssTotal === 0 ? 0 : 1 - (ssResidual / ssTotal);

        return { slope, intercept, rSquared: Math.max(0, rSquared) };
    },

    /**
     * Fit data to a complexity class
     * Transforms x values according to the complexity class and performs linear regression
     */
    fitComplexity: function(data, complexityClass) {
        const transform = this.complexityClasses[complexityClass].transform;

        // Transform n values
        const transformedN = data.map(d => transform(d.n));
        const times = data.map(d => d.time);

        // Handle edge cases
        if (transformedN.some(v => !isFinite(v) || isNaN(v))) {
            return { rSquared: -1, coefficient: 0, constant: 0, invalid: true };
        }

        const regression = this.linearRegression(transformedN, times);

        return {
            rSquared: regression.rSquared,
            coefficient: regression.slope,
            constant: regression.intercept,
            complexityClass: complexityClass
        };
    },

    /**
     * Fit data to all complexity classes and find the best fit
     */
    fitAllComplexities: function(data) {
        const results = [];
        const classNames = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(n³)'];

        // Only include exponential if data is small enough
        const maxN = Math.max(...data.map(d => d.n));
        if (maxN <= 30) {
            classNames.push('O(2ⁿ)');
        }

        classNames.forEach(className => {
            const fit = this.fitComplexity(data, className);
            if (!fit.invalid) {
                results.push({
                    ...fit,
                    name: className,
                    label: this.complexityClasses[className].label,
                    color: this.complexityClasses[className].color
                });
            }
        });

        // Sort by R-squared descending
        results.sort((a, b) => b.rSquared - a.rSquared);

        // Mark best fit
        if (results.length > 0) {
            results[0].isBestFit = true;
        }

        return results;
    },

    /**
     * Generate predicted values for a complexity fit
     */
    generatePredictions: function(fit, nValues) {
        const transform = this.complexityClasses[fit.complexityClass].transform;
        return nValues.map(n => {
            const transformedN = transform(n);
            return Math.max(0, fit.coefficient * transformedN + fit.constant);
        });
    },

    /**
     * Analyze time complexity data
     */
    analyzeComplexity: function(data) {
        // Sort data by n
        const sortedData = [...data].sort((a, b) => a.n - b.n);

        // Fit all complexity classes
        const fits = this.fitAllComplexities(sortedData);

        // Get best fit
        const bestFit = fits.find(f => f.isBestFit) || fits[0];

        // Generate predictions for the best fit
        const nValues = sortedData.map(d => d.n);
        const predictions = bestFit ? this.generatePredictions(bestFit, nValues) : [];

        // Determine confidence based on R-squared of best fit
        let confidence;
        if (!bestFit || bestFit.rSquared < 0.7) {
            confidence = { level: 'Low', description: 'Poor fit - data may not follow standard complexity classes' };
        } else if (bestFit.rSquared < 0.9) {
            confidence = { level: 'Moderate', description: 'Reasonable fit - some variance unexplained' };
        } else if (bestFit.rSquared < 0.98) {
            confidence = { level: 'High', description: 'Good fit - data matches complexity class well' };
        } else {
            confidence = { level: 'Very High', description: 'Excellent fit - data closely matches complexity class' };
        }

        return {
            data: sortedData,
            fits: fits,
            bestFit: bestFit,
            predictions: predictions,
            confidence: confidence
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Stats;
}
