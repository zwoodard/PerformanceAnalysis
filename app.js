/**
 * Performance Analysis Tool - Main Application
 * Handles tab switching and all three analysis tools
 */

document.addEventListener('DOMContentLoaded', function() {

    // ==========================================
    // Tab Navigation
    // ==========================================

    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            // Update active states
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById('tab-' + tabId).classList.add('active');
        });
    });

    // ==========================================
    // Utility Functions
    // ==========================================

    function parseData(text) {
        if (!text.trim()) return [];
        return text.split(/[,\n\s\t]+/)
            .map(s => s.trim())
            .filter(s => s !== '')
            .map(s => parseFloat(s))
            .filter(n => !isNaN(n));
    }

    function formatNumber(num, decimals = 2) {
        if (typeof num !== 'number' || isNaN(num)) return '-';
        return num.toFixed(decimals);
    }

    function createStatRow(label, value) {
        return `<div class="stat-row">
            <span class="stat-label">${label}</span>
            <span class="stat-value">${value}</span>
        </div>`;
    }

    // ==========================================
    // Before/After Analysis Tool
    // ==========================================

    const baBeforeInput = document.getElementById('before-data');
    const baAfterInput = document.getElementById('after-data');
    const baAnalyzeBtn = document.getElementById('ba-analyze-btn');
    const baClearBtn = document.getElementById('ba-clear-btn');
    const baSampleBtn = document.getElementById('ba-sample-btn');
    const baResults = document.getElementById('ba-results');
    const baBeforeStats = document.getElementById('before-stats');
    const baAfterStats = document.getElementById('after-stats');

    function updateBAQuickStats(input, statsEl) {
        const data = parseData(input.value);
        if (data.length === 0) {
            statsEl.textContent = 'Enter data to see preview...';
            return;
        }
        const mean = Stats.mean(data);
        const stdDev = Stats.stdDev(data);
        statsEl.textContent = `n=${data.length} | Mean: ${formatNumber(mean)} | StdDev: ${formatNumber(stdDev)}`;
    }

    function renderBASampleStats(containerId, stats) {
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

    function renderBAComparisonStats(analysis) {
        const container = document.querySelector('#ba-comparison-summary .stat-content');
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

    function renderBASummary(analysis) {
        const summary = document.getElementById('ba-summary');
        const absChange = Math.abs(analysis.percentChange);

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

    function renderBAInterpretation(analysis) {
        const interpretation = document.getElementById('ba-interpretation');
        const insights = [];

        if (analysis.isSignificant) {
            if (analysis.isFaster) {
                insights.push(`The "After" group shows <strong>statistically significant improvement</strong> with ${formatNumber(Math.abs(analysis.percentChange))}% lower values on average.`);
            } else {
                insights.push(`The "After" group shows <strong>statistically significant regression</strong> with ${formatNumber(Math.abs(analysis.percentChange))}% higher values on average.`);
            }
        } else {
            insights.push(`There is <strong>no statistically significant difference</strong> between the two groups. Any observed difference could be due to random variation.`);
        }

        const effectDesc = {
            'negligible': 'The effect size is negligible, meaning the practical difference is very small.',
            'small': 'The effect size is small, indicating a modest but potentially meaningful difference.',
            'medium': 'The effect size is medium, suggesting a meaningful practical difference.',
            'large': 'The effect size is large, indicating a substantial practical difference.'
        };
        insights.push(effectDesc[analysis.effectInterpretation]);

        const totalN = analysis.before.n + analysis.after.n;
        if (totalN < 20) {
            insights.push(`<em>Note: With only ${totalN} total data points, consider collecting more samples for more reliable results.</em>`);
        }

        interpretation.innerHTML = `
            <h3>Interpretation</h3>
            <ul>${insights.map(i => `<li>${i}</li>`).join('')}</ul>
        `;
    }

    function runBAAnalysis() {
        const beforeData = parseData(baBeforeInput.value);
        const afterData = parseData(baAfterInput.value);

        if (beforeData.length < 2) {
            alert('Please enter at least 2 values for the "Before" group.');
            return;
        }
        if (afterData.length < 2) {
            alert('Please enter at least 2 values for the "After" group.');
            return;
        }

        const analysis = Stats.analyze(beforeData, afterData);

        renderBASummary(analysis);
        renderBASampleStats('ba-before-summary', analysis.before);
        renderBASampleStats('ba-after-summary', analysis.after);
        renderBAComparisonStats(analysis);
        renderBAInterpretation(analysis);

        baResults.style.display = 'block';

        requestAnimationFrame(() => {
            Charts.renderAll(beforeData, afterData, analysis.before, analysis.after);
        });

        baResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function clearBAAll() {
        baBeforeInput.value = '';
        baAfterInput.value = '';
        baBeforeStats.textContent = 'Enter data to see preview...';
        baAfterStats.textContent = 'Enter data to see preview...';
        baResults.style.display = 'none';
    }

    function loadBASampleData() {
        const beforeSample = [245, 238, 267, 251, 243, 259, 248, 262, 255, 241, 257, 249, 263, 246, 252, 268, 244, 258, 253, 247, 261, 250, 264, 242, 256];
        const afterSample = [198, 205, 192, 211, 195, 203, 189, 207, 196, 201, 194, 208, 191, 204, 199, 206, 193, 210, 197, 202, 188, 209, 195, 200, 190];
        baBeforeInput.value = beforeSample.join('\n');
        baAfterInput.value = afterSample.join('\n');
        updateBAQuickStats(baBeforeInput, baBeforeStats);
        updateBAQuickStats(baAfterInput, baAfterStats);
    }

    baAnalyzeBtn.addEventListener('click', runBAAnalysis);
    baClearBtn.addEventListener('click', clearBAAll);
    baSampleBtn.addEventListener('click', loadBASampleData);
    baBeforeInput.addEventListener('input', () => updateBAQuickStats(baBeforeInput, baBeforeStats));
    baAfterInput.addEventListener('input', () => updateBAQuickStats(baAfterInput, baAfterStats));

    // ==========================================
    // Multi-Variate Analysis Tool
    // ==========================================

    const mvTreatmentsList = document.getElementById('mv-treatments');
    const mvAddTreatmentBtn = document.getElementById('mv-add-treatment');
    const mvGroupList = document.getElementById('mv-group-list');
    const mvAddGroupBtn = document.getElementById('mv-add-group');
    const mvAnalyzeBtn = document.getElementById('mv-analyze-btn');
    const mvClearBtn = document.getElementById('mv-clear-btn');
    const mvSampleBtn = document.getElementById('mv-sample-btn');
    const mvResults = document.getElementById('mv-results');

    let mvGroupCounter = 0;

    function getMVTreatmentNames() {
        return Array.from(mvTreatmentsList.querySelectorAll('.treatment-name'))
            .map(input => input.value.trim())
            .filter(name => name !== '');
    }

    function addMVTreatment(name = '') {
        const item = document.createElement('div');
        item.className = 'treatment-item';
        item.innerHTML = `
            <input type="text" class="treatment-name" placeholder="Treatment name" value="${name}">
            <button class="remove-treatment-btn" title="Remove">&times;</button>
        `;
        item.querySelector('.remove-treatment-btn').addEventListener('click', () => {
            item.remove();
            updateMVGroups();
        });
        item.querySelector('.treatment-name').addEventListener('input', updateMVGroups);
        mvTreatmentsList.appendChild(item);
        updateMVGroups();
    }

    function addMVGroup(name = '', treatments = {}, data = '') {
        mvGroupCounter++;
        const groupName = name || `Group ${mvGroupCounter}`;
        const treatmentNames = getMVTreatmentNames();

        const card = document.createElement('div');
        card.className = 'group-card';
        card.dataset.groupId = mvGroupCounter;

        let treatmentToggles = treatmentNames.map(t => `
            <label class="treatment-toggle">
                <input type="checkbox" data-treatment="${t}" ${treatments[t] ? 'checked' : ''}>
                ${t}
            </label>
        `).join('');

        card.innerHTML = `
            <div class="group-header">
                <input type="text" class="group-name" value="${groupName}">
                <button class="remove-group-btn" title="Remove">&times;</button>
            </div>
            <div class="group-treatments">${treatmentToggles || '<em>Add treatments above</em>'}</div>
            <div class="group-data">
                <textarea placeholder="Enter timing values...">${data}</textarea>
            </div>
        `;

        card.querySelector('.remove-group-btn').addEventListener('click', () => card.remove());
        mvGroupList.appendChild(card);
    }

    function updateMVGroups() {
        const treatmentNames = getMVTreatmentNames();
        document.querySelectorAll('.group-card').forEach(card => {
            const treatmentsDiv = card.querySelector('.group-treatments');
            const currentChecked = {};
            treatmentsDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                currentChecked[cb.dataset.treatment] = cb.checked;
            });

            if (treatmentNames.length === 0) {
                treatmentsDiv.innerHTML = '<em>Add treatments above</em>';
            } else {
                treatmentsDiv.innerHTML = treatmentNames.map(t => `
                    <label class="treatment-toggle">
                        <input type="checkbox" data-treatment="${t}" ${currentChecked[t] ? 'checked' : ''}>
                        ${t}
                    </label>
                `).join('');
            }
        });
    }

    function getMVGroupsData() {
        const groups = [];
        document.querySelectorAll('.group-card').forEach(card => {
            const name = card.querySelector('.group-name').value.trim() || 'Unnamed';
            const treatments = {};
            card.querySelectorAll('.group-treatments input[type="checkbox"]').forEach(cb => {
                treatments[cb.dataset.treatment] = cb.checked;
            });
            const data = parseData(card.querySelector('textarea').value);
            if (data.length > 0) {
                groups.push({ name, treatments, data });
            }
        });
        return groups;
    }

    function renderMVSummary(results) {
        const summary = document.getElementById('mv-summary');
        const significantTreatments = results.treatments.filter(t => t.isSignificant && !t.insufficient);

        let verdictText, verdictClass;
        if (significantTreatments.length === 0) {
            verdictText = 'No Significant Treatment Effects';
            verdictClass = 'neutral';
        } else {
            verdictText = `${significantTreatments.length} Significant Treatment${significantTreatments.length > 1 ? 's' : ''} Found`;
            verdictClass = 'good';
        }

        summary.className = `summary-card ${verdictClass}`;
        summary.innerHTML = `
            <h3>Multi-Variate Analysis Result</h3>
            <div class="verdict ${verdictClass}">${verdictText}</div>
            <div class="sub-verdict">Analyzed ${results.groups.length} groups with ${results.treatments.length} treatments</div>
        `;
    }

    function renderMVEffects(results) {
        const effectsGrid = document.getElementById('mv-effects');
        effectsGrid.innerHTML = results.treatments.map(t => {
            if (t.insufficient) {
                return `
                    <div class="effect-card">
                        <h4>${t.name}</h4>
                        <div class="effect-value neutral">?</div>
                        <div class="effect-detail">Insufficient data</div>
                    </div>
                `;
            }
            const isImprovement = t.percentEffect < 0;
            const valueClass = t.isSignificant ? (isImprovement ? 'positive' : 'negative') : 'neutral';
            return `
                <div class="effect-card">
                    <h4>${t.name}</h4>
                    <div class="effect-value ${valueClass}">${t.percentEffect > 0 ? '+' : ''}${formatNumber(t.percentEffect)}%</div>
                    <div class="effect-detail">${t.isSignificant ? 'Significant' : 'Not significant'} (p=${formatNumber(t.pValue, 3)})</div>
                </div>
            `;
        }).join('');
    }

    function renderMVInterpretation(results) {
        const interpretation = document.getElementById('mv-interpretation');
        const insights = [];

        const significant = results.treatments.filter(t => t.isSignificant && !t.insufficient);
        const improving = significant.filter(t => t.percentEffect < 0);
        const worsening = significant.filter(t => t.percentEffect > 0);

        if (improving.length > 0) {
            insights.push(`<strong>Treatments that improve performance:</strong> ${improving.map(t => `${t.name} (${formatNumber(t.percentEffect)}%)`).join(', ')}`);
        }
        if (worsening.length > 0) {
            insights.push(`<strong>Treatments that worsen performance:</strong> ${worsening.map(t => `${t.name} (+${formatNumber(t.percentEffect)}%)`).join(', ')}`);
        }
        if (significant.length === 0) {
            insights.push('No treatments showed statistically significant effects on performance.');
        }

        const insufficientData = results.treatments.filter(t => t.insufficient);
        if (insufficientData.length > 0) {
            insights.push(`<em>Note: ${insufficientData.map(t => t.name).join(', ')} had insufficient data for analysis. Ensure you have groups both with and without each treatment.</em>`);
        }

        interpretation.innerHTML = `
            <h3>Interpretation</h3>
            <ul>${insights.map(i => `<li>${i}</li>`).join('')}</ul>
        `;
    }

    function runMVAnalysis() {
        const treatmentNames = getMVTreatmentNames();
        const groups = getMVGroupsData();

        if (treatmentNames.length === 0) {
            alert('Please add at least one treatment.');
            return;
        }
        if (groups.length < 2) {
            alert('Please add at least 2 groups with data.');
            return;
        }

        const results = Stats.analyzeMultiVariate(groups, treatmentNames);

        renderMVSummary(results);
        renderMVEffects(results);
        renderMVInterpretation(results);

        mvResults.style.display = 'block';

        requestAnimationFrame(() => {
            Charts.drawTreatmentEffects('mv-effects-chart', results.treatments);
            Charts.drawGroupComparison('mv-groups-chart', results.groups);
        });

        mvResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function clearMVAll() {
        mvTreatmentsList.innerHTML = '';
        addMVTreatment('Treatment A');
        addMVTreatment('Treatment B');
        mvGroupList.innerHTML = '';
        mvGroupCounter = 0;
        mvResults.style.display = 'none';
    }

    function loadMVSampleData() {
        // Clear existing
        mvTreatmentsList.innerHTML = '';
        mvGroupList.innerHTML = '';
        mvGroupCounter = 0;

        // Add treatments
        addMVTreatment('Caching');
        addMVTreatment('CDN');

        // Add groups with different treatment combinations
        setTimeout(() => {
            addMVGroup('Baseline', { 'Caching': false, 'CDN': false }, '250, 245, 260, 255, 248, 262, 253, 247, 258, 251');
            addMVGroup('Caching Only', { 'Caching': true, 'CDN': false }, '180, 175, 190, 185, 178, 192, 183, 177, 188, 181');
            addMVGroup('CDN Only', { 'Caching': false, 'CDN': true }, '220, 215, 230, 225, 218, 232, 223, 217, 228, 221');
            addMVGroup('Both', { 'Caching': true, 'CDN': true }, '150, 145, 160, 155, 148, 162, 153, 147, 158, 151');
        }, 100);
    }

    mvAddTreatmentBtn.addEventListener('click', () => addMVTreatment());
    mvAddGroupBtn.addEventListener('click', () => addMVGroup());
    mvAnalyzeBtn.addEventListener('click', runMVAnalysis);
    mvClearBtn.addEventListener('click', clearMVAll);
    mvSampleBtn.addEventListener('click', loadMVSampleData);

    // Initialize with default treatments
    mvTreatmentsList.querySelectorAll('.remove-treatment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.parentElement.remove();
            updateMVGroups();
        });
    });
    mvTreatmentsList.querySelectorAll('.treatment-name').forEach(input => {
        input.addEventListener('input', updateMVGroups);
    });

    // ==========================================
    // Time Complexity Fitter Tool
    // ==========================================

    const tcDataInput = document.getElementById('tc-data');
    const tcAnalyzeBtn = document.getElementById('tc-analyze-btn');
    const tcClearBtn = document.getElementById('tc-clear-btn');
    const tcSampleBtn = document.getElementById('tc-sample-btn');
    const tcResults = document.getElementById('tc-results');

    function parseTCData(text) {
        const lines = text.trim().split('\n');
        const data = [];
        lines.forEach(line => {
            const parts = line.split(/[,\s\t]+/).map(s => s.trim()).filter(s => s !== '');
            if (parts.length >= 2) {
                const n = parseFloat(parts[0]);
                const time = parseFloat(parts[1]);
                if (!isNaN(n) && !isNaN(time) && n > 0 && time >= 0) {
                    data.push({ n, time });
                }
            }
        });
        return data;
    }

    function renderTCSummary(results) {
        const summary = document.getElementById('tc-summary');
        const best = results.bestFit;

        if (!best) {
            summary.className = 'summary-card neutral';
            summary.innerHTML = `
                <h3>Time Complexity Analysis</h3>
                <div class="verdict neutral">Unable to Fit</div>
                <div class="sub-verdict">Could not determine complexity class from the provided data</div>
            `;
            return;
        }

        const confidenceClass = results.confidence.level === 'Very High' || results.confidence.level === 'High' ? 'good' :
                               results.confidence.level === 'Moderate' ? 'neutral' : 'bad';

        summary.className = `summary-card ${confidenceClass}`;
        summary.innerHTML = `
            <h3>Time Complexity Analysis</h3>
            <div class="verdict ${confidenceClass}" style="color: ${best.color}">${best.name}</div>
            <div class="sub-verdict">${best.label} complexity (R² = ${formatNumber(best.rSquared, 4)})</div>
            <div class="confidence" style="margin-top: 0.5rem">${results.confidence.description}</div>
        `;
    }

    function renderTCFits(results) {
        const fitsGrid = document.getElementById('tc-fits');
        fitsGrid.innerHTML = results.fits.slice(0, 6).map(fit => `
            <div class="fit-card ${fit.isBestFit ? 'best-fit' : ''}">
                <h4 style="color: ${fit.color}">${fit.name}</h4>
                <div class="r-squared">R² = ${formatNumber(fit.rSquared, 4)}</div>
                <div class="fit-label">${fit.isBestFit ? 'Best Fit' : fit.label}</div>
            </div>
        `).join('');
    }

    function renderTCInterpretation(results) {
        const interpretation = document.getElementById('tc-interpretation');
        const insights = [];
        const best = results.bestFit;

        if (!best) {
            insights.push('Unable to determine complexity class. Please check your input data.');
        } else {
            insights.push(`The data best fits <strong>${best.name} (${best.label})</strong> complexity with R² = ${formatNumber(best.rSquared, 4)}.`);

            if (best.rSquared > 0.95) {
                insights.push('The fit is excellent, indicating high confidence in this complexity classification.');
            } else if (best.rSquared > 0.85) {
                insights.push('The fit is good, though some variance remains unexplained. Consider collecting more data points.');
            } else {
                insights.push('The fit is moderate. The algorithm may have multiple phases or the data may have significant noise.');
            }

            // Compare with next best
            if (results.fits.length > 1) {
                const second = results.fits[1];
                const diff = best.rSquared - second.rSquared;
                if (diff < 0.05) {
                    insights.push(`<em>Note: ${second.name} also fits well (R² = ${formatNumber(second.rSquared, 4)}). More data points may help distinguish between these classes.</em>`);
                }
            }

            // Practical implications
            const implications = {
                'O(1)': 'Constant time - performance does not depend on input size.',
                'O(log n)': 'Logarithmic - very efficient, often seen in binary search and balanced tree operations.',
                'O(n)': 'Linear - performance scales directly with input size.',
                'O(n log n)': 'Linearithmic - typical of efficient sorting algorithms like merge sort and quicksort.',
                'O(n²)': 'Quadratic - may become slow for large inputs. Consider algorithmic improvements.',
                'O(n³)': 'Cubic - will be very slow for large inputs. Algorithmic optimization is recommended.',
                'O(2ⁿ)': 'Exponential - only practical for small inputs. Consider dynamic programming or approximation algorithms.'
            };
            if (implications[best.name]) {
                insights.push(implications[best.name]);
            }
        }

        interpretation.innerHTML = `
            <h3>Interpretation</h3>
            <ul>${insights.map(i => `<li>${i}</li>`).join('')}</ul>
        `;
    }

    function runTCAnalysis() {
        const data = parseTCData(tcDataInput.value);

        if (data.length < 3) {
            alert('Please enter at least 3 data points (n, time pairs).');
            return;
        }

        const results = Stats.analyzeComplexity(data);

        renderTCSummary(results);
        renderTCFits(results);
        renderTCInterpretation(results);

        tcResults.style.display = 'block';

        requestAnimationFrame(() => {
            Charts.drawComplexityFit('tc-fit-chart', results.data, results.bestFit, results.predictions);
            Charts.drawComplexityComparison('tc-comparison-chart', results.data, results.fits);
        });

        tcResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function clearTCAll() {
        tcDataInput.value = '';
        tcResults.style.display = 'none';
    }

    function loadTCSampleData() {
        // O(n²) sample data (like bubble sort)
        const sampleData = `100, 10
200, 40
400, 160
800, 640
1600, 2560
3200, 10240`;
        tcDataInput.value = sampleData;
    }

    tcAnalyzeBtn.addEventListener('click', runTCAnalysis);
    tcClearBtn.addEventListener('click', clearTCAll);
    tcSampleBtn.addEventListener('click', loadTCSampleData);

    // ==========================================
    // Window Resize Handler
    // ==========================================

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Re-render visible charts
            if (baResults.style.display !== 'none') {
                const beforeData = parseData(baBeforeInput.value);
                const afterData = parseData(baAfterInput.value);
                if (beforeData.length >= 2 && afterData.length >= 2) {
                    const analysis = Stats.analyze(beforeData, afterData);
                    Charts.renderAll(beforeData, afterData, analysis.before, analysis.after);
                }
            }
            if (mvResults.style.display !== 'none') {
                const treatmentNames = getMVTreatmentNames();
                const groups = getMVGroupsData();
                if (groups.length >= 2) {
                    const results = Stats.analyzeMultiVariate(groups, treatmentNames);
                    Charts.drawTreatmentEffects('mv-effects-chart', results.treatments);
                    Charts.drawGroupComparison('mv-groups-chart', results.groups);
                }
            }
            if (tcResults.style.display !== 'none') {
                const data = parseTCData(tcDataInput.value);
                if (data.length >= 3) {
                    const results = Stats.analyzeComplexity(data);
                    Charts.drawComplexityFit('tc-fit-chart', results.data, results.bestFit, results.predictions);
                    Charts.drawComplexityComparison('tc-comparison-chart', results.data, results.fits);
                }
            }
        }, 250);
    });
});
