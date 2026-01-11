/**
 * Performance Analysis Tool - Main Application
 * Ties together the statistics and charting modules
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const beforeInput = document.getElementById('before-data');
    const afterInput = document.getElementById('after-data');
    const analyzeBtn = document.getElementById('analyze-btn');
    const clearBtn = document.getElementById('clear-btn');
    const sampleBtn = document.getElementById('sample-btn');
    const resultsSection = document.getElementById('results');
    const beforeStatsEl = document.getElementById('before-stats');
    const afterStatsEl = document.getElementById('after-stats');

    /**
     * Parse input text into array of numbers
     */
    function parseData(text) {
        if (!text.trim()) return [];

        // Split by comma, newline, space, or tab
        const values = text.split(/[,\n\s\t]+/)
            .map(s => s.trim())
            .filter(s => s !== '')
            .map(s => parseFloat(s))
            .filter(n => !isNaN(n));

        return values;
    }

    /**
     * Format a number for display
     */
    function formatNumber(num, decimals = 2) {
        if (typeof num !== 'number' || isNaN(num)) return '-';
        return num.toFixed(decimals);
    }

    /**
     * Update quick stats preview as user types
     */
    function updateQuickStats(input, statsEl) {
        const data = parseData(input.value);
        if (data.length === 0) {
            statsEl.textContent = 'Enter data to see preview...';
            return;
        }

        const mean = Stats.mean(data);
        const stdDev = Stats.stdDev(data);
        statsEl.textContent = `n=${data.length} | Mean: ${formatNumber(mean)} | StdDev: ${formatNumber(stdDev)}`;
    }

    /**
     * Create a stat row element
     */
    function createStatRow(label, value) {
        return `<div class="stat-row">
            <span class="stat-label">${label}</span>
            <span class="stat-value">${value}</span>
        </div>`;
    }

    /**
     * Render descriptive statistics for a sample
     */
    function renderSampleStats(containerId, stats) {
        const container = document.querySelector(`#${containerId} .stat-content`);
        container.innerHTML = `
            ${createStatRow('Sample Size (n)', stats.n)}
            ${createStatRow('Mean', formatNumber(stats.mean))}
            ${createStatRow('Median', formatNumber(stats.median))}
            ${createStatRow('Std Dev', formatNumber(stats.stdDev))}
            ${createStatRow('Std Error', formatNumber(stats.standardError))}
            ${createStatRow('Min', formatNumber(stats.min))}
            ${createStatRow('Max', formatNumber(stats.max))}
            ${createStatRow('IQR', formatNumber(stats.iqr))}
        `;
    }

    /**
     * Render comparison statistics
     */
    function renderComparisonStats(analysis) {
        const container = document.querySelector('#comparison-summary .stat-content');
        container.innerHTML = `
            ${createStatRow('Mean Difference', formatNumber(analysis.after.mean - analysis.before.mean))}
            ${createStatRow('% Change', formatNumber(analysis.percentChange) + '%')}
            ${createStatRow("Cohen's d", formatNumber(analysis.cohensD))}
            ${createStatRow('Effect Size', analysis.effectInterpretation)}
            ${createStatRow('t-statistic', formatNumber(analysis.tTest.t, 3))}
            ${createStatRow('Degrees of Freedom', formatNumber(analysis.tTest.df, 1))}
            ${createStatRow('p-value', analysis.tTest.pValue < 0.001 ? '< 0.001' : formatNumber(analysis.tTest.pValue, 4))}
            ${createStatRow('Confidence', analysis.pInterpretation.level)}
        `;
    }

    /**
     * Render the main summary card
     */
    function renderSummary(analysis) {
        const summary = document.getElementById('summary');
        const absChange = Math.abs(analysis.percentChange);
        const direction = analysis.isFaster ? 'faster' : 'slower';

        let verdictText, verdictClass, confidenceText;

        if (analysis.isSignificant) {
            verdictText = analysis.isFaster
                ? `${formatNumber(absChange)}% Faster`
                : `${formatNumber(absChange)}% Slower`;
            verdictClass = analysis.isFaster ? 'faster' : 'slower';
            confidenceText = `${analysis.pInterpretation.confidence}% confidence (p = ${analysis.tTest.pValue < 0.001 ? '< 0.001' : formatNumber(analysis.tTest.pValue, 4)})`;
        } else {
            verdictText = 'No Significant Difference';
            verdictClass = 'inconclusive';
            confidenceText = `Insufficient evidence to conclude a difference (p = ${formatNumber(analysis.tTest.pValue, 4)})`;
        }

        summary.className = `summary-card ${verdictClass}`;
        summary.innerHTML = `
            <h3>Performance Comparison Result</h3>
            <div class="verdict ${verdictClass}">${verdictText}</div>
            <div class="confidence">${confidenceText}</div>
            <div class="confidence-bar">
                <div class="confidence-bar-fill ${analysis.pInterpretation.level === 'Very High' || analysis.pInterpretation.level === 'High' ? 'high' : analysis.pInterpretation.level === 'Moderate' ? 'medium' : 'low'}"
                     style="width: ${Math.min(100, (1 - analysis.tTest.pValue) * 100)}%"></div>
            </div>
        `;
    }

    /**
     * Render interpretation section
     */
    function renderInterpretation(analysis) {
        const interpretation = document.getElementById('interpretation');
        const insights = [];

        // Main finding
        if (analysis.isSignificant) {
            if (analysis.isFaster) {
                insights.push(`The "After" group shows <strong>statistically significant improvement</strong> with ${formatNumber(Math.abs(analysis.percentChange))}% lower values on average.`);
            } else {
                insights.push(`The "After" group shows <strong>statistically significant regression</strong> with ${formatNumber(Math.abs(analysis.percentChange))}% higher values on average.`);
            }
        } else {
            insights.push(`There is <strong>no statistically significant difference</strong> between the two groups. Any observed difference could be due to random variation.`);
        }

        // Effect size interpretation
        const effectDesc = {
            'negligible': 'The effect size is negligible, meaning the practical difference is very small.',
            'small': 'The effect size is small, indicating a modest but potentially meaningful difference.',
            'medium': 'The effect size is medium, suggesting a meaningful practical difference.',
            'large': 'The effect size is large, indicating a substantial practical difference.'
        };
        insights.push(effectDesc[analysis.effectInterpretation]);

        // Sample size note
        const totalN = analysis.before.n + analysis.after.n;
        if (totalN < 20) {
            insights.push(`<em>Note: With only ${totalN} total data points, consider collecting more samples for more reliable results.</em>`);
        } else if (totalN >= 100) {
            insights.push(`With ${totalN} data points, these results have good statistical power.`);
        }

        // Variability comparison
        const cvBefore = (analysis.before.stdDev / analysis.before.mean) * 100;
        const cvAfter = (analysis.after.stdDev / analysis.after.mean) * 100;
        if (Math.abs(cvBefore - cvAfter) > 20) {
            insights.push(`The variability differs notably between groups (CV: Before ${formatNumber(cvBefore)}%, After ${formatNumber(cvAfter)}%), which Welch's t-test accounts for.`);
        }

        interpretation.innerHTML = `
            <h3>Interpretation</h3>
            <ul>
                ${insights.map(insight => `<li>${insight}</li>`).join('')}
            </ul>
        `;
    }

    /**
     * Run the full analysis
     */
    function runAnalysis() {
        const beforeData = parseData(beforeInput.value);
        const afterData = parseData(afterInput.value);

        // Validate input
        if (beforeData.length < 2) {
            alert('Please enter at least 2 values for the "Before" group.');
            return;
        }
        if (afterData.length < 2) {
            alert('Please enter at least 2 values for the "After" group.');
            return;
        }

        // Run statistical analysis
        const analysis = Stats.analyze(beforeData, afterData);

        // Render results
        renderSummary(analysis);
        renderSampleStats('before-summary', analysis.before);
        renderSampleStats('after-summary', analysis.after);
        renderComparisonStats(analysis);
        renderInterpretation(analysis);

        // Render charts
        Charts.renderAll(beforeData, afterData, analysis.before, analysis.after);

        // Show results section
        resultsSection.style.display = 'block';

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * Clear all inputs and results
     */
    function clearAll() {
        beforeInput.value = '';
        afterInput.value = '';
        beforeStatsEl.textContent = 'Enter data to see preview...';
        afterStatsEl.textContent = 'Enter data to see preview...';
        resultsSection.style.display = 'none';
    }

    /**
     * Load sample data for demonstration
     */
    function loadSampleData() {
        // Simulated page load times (ms) before and after optimization
        const beforeSample = [
            245, 238, 267, 251, 243, 259, 248, 262, 255, 241,
            257, 249, 263, 246, 252, 268, 244, 258, 253, 247,
            261, 250, 264, 242, 256
        ];

        const afterSample = [
            198, 205, 192, 211, 195, 203, 189, 207, 196, 201,
            194, 208, 191, 204, 199, 206, 193, 210, 197, 202,
            188, 209, 195, 200, 190
        ];

        beforeInput.value = beforeSample.join('\n');
        afterInput.value = afterSample.join('\n');

        updateQuickStats(beforeInput, beforeStatsEl);
        updateQuickStats(afterInput, afterStatsEl);
    }

    // Event listeners
    analyzeBtn.addEventListener('click', runAnalysis);
    clearBtn.addEventListener('click', clearAll);
    sampleBtn.addEventListener('click', loadSampleData);

    // Live preview updates
    beforeInput.addEventListener('input', () => updateQuickStats(beforeInput, beforeStatsEl));
    afterInput.addEventListener('input', () => updateQuickStats(afterInput, afterStatsEl));

    // Handle window resize for chart responsiveness
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (resultsSection.style.display !== 'none') {
                const beforeData = parseData(beforeInput.value);
                const afterData = parseData(afterInput.value);
                if (beforeData.length >= 2 && afterData.length >= 2) {
                    const analysis = Stats.analyze(beforeData, afterData);
                    Charts.renderAll(beforeData, afterData, analysis.before, analysis.after);
                }
            }
        }, 250);
    });
});
