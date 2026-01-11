/**
 * Charts Module
 * Provides canvas-based visualizations for performance data
 */

const Charts = {
    colors: {
        before: '#6366f1',
        beforeLight: 'rgba(99, 102, 241, 0.3)',
        after: '#10b981',
        afterLight: 'rgba(16, 185, 129, 0.3)',
        grid: '#e5e7eb',
        text: '#6b7280',
        textDark: '#1f2937'
    },

    /**
     * Clear a canvas and get its context
     */
    prepareCanvas: function(canvasId) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');

        // Set actual size in memory (scaled for retina)
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        // Scale context to match
        ctx.scale(dpr, dpr);

        // Clear canvas
        ctx.clearRect(0, 0, rect.width, rect.height);

        return { ctx, width: rect.width, height: rect.height };
    },

    /**
     * Draw a histogram comparing two datasets
     */
    drawHistogram: function(canvasId, beforeData, afterData) {
        const { ctx, width, height } = this.prepareCanvas(canvasId);
        const padding = { top: 20, right: 20, bottom: 40, left: 50 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Combine data to find overall range
        const allData = [...beforeData, ...afterData];
        const min = Math.min(...allData);
        const max = Math.max(...allData);
        const range = max - min || 1;

        // Create bins
        const binCount = Math.min(15, Math.ceil(Math.sqrt(allData.length)));
        const binWidth = range / binCount;

        const createBins = (data) => {
            const bins = new Array(binCount).fill(0);
            data.forEach(val => {
                let binIndex = Math.floor((val - min) / binWidth);
                binIndex = Math.min(binIndex, binCount - 1);
                bins[binIndex]++;
            });
            return bins;
        };

        const beforeBins = createBins(beforeData);
        const afterBins = createBins(afterData);
        const maxCount = Math.max(...beforeBins, ...afterBins);

        // Draw grid lines
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        // Draw bars
        const barGroupWidth = chartWidth / binCount;
        const barWidth = barGroupWidth * 0.35;
        const gap = barGroupWidth * 0.1;

        for (let i = 0; i < binCount; i++) {
            const x = padding.left + i * barGroupWidth;

            // Before bar
            const beforeHeight = (beforeBins[i] / maxCount) * chartHeight;
            ctx.fillStyle = this.colors.beforeLight;
            ctx.strokeStyle = this.colors.before;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.rect(x + gap, padding.top + chartHeight - beforeHeight, barWidth, beforeHeight);
            ctx.fill();
            ctx.stroke();

            // After bar
            const afterHeight = (afterBins[i] / maxCount) * chartHeight;
            ctx.fillStyle = this.colors.afterLight;
            ctx.strokeStyle = this.colors.after;
            ctx.beginPath();
            ctx.rect(x + gap + barWidth + gap, padding.top + chartHeight - afterHeight, barWidth, afterHeight);
            ctx.fill();
            ctx.stroke();
        }

        // Draw axes
        ctx.strokeStyle = this.colors.textDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();

        // Y-axis labels
        ctx.fillStyle = this.colors.text;
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) {
            const value = Math.round(maxCount * (1 - i / 5));
            const y = padding.top + (chartHeight / 5) * i;
            ctx.fillText(value.toString(), padding.left - 8, y);
        }

        // X-axis labels
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let i = 0; i <= binCount; i += Math.ceil(binCount / 5)) {
            const value = min + (range / binCount) * i;
            const x = padding.left + (chartWidth / binCount) * i;
            ctx.fillText(value.toFixed(0), x, height - padding.bottom + 8);
        }

        // Draw legend
        this.drawLegend(ctx, width, padding.top);
    },

    /**
     * Draw box plots for comparison
     */
    drawBoxPlot: function(canvasId, beforeData, afterData, beforeStats, afterStats) {
        const { ctx, width, height } = this.prepareCanvas(canvasId);
        const padding = { top: 30, right: 30, bottom: 40, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Find overall range
        const allMin = Math.min(beforeStats.min, afterStats.min);
        const allMax = Math.max(beforeStats.max, afterStats.max);
        const range = allMax - allMin || 1;
        const buffer = range * 0.1;
        const displayMin = allMin - buffer;
        const displayMax = allMax + buffer;
        const displayRange = displayMax - displayMin;

        const scaleY = (val) => padding.top + chartHeight - ((val - displayMin) / displayRange) * chartHeight;

        // Draw grid lines
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        const gridLines = 6;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartHeight / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        // Draw Y-axis labels
        ctx.fillStyle = this.colors.text;
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= gridLines; i++) {
            const value = displayMax - (displayRange / gridLines) * i;
            const y = padding.top + (chartHeight / gridLines) * i;
            ctx.fillText(value.toFixed(1), padding.left - 8, y);
        }

        const drawBox = (stats, data, centerX, color, colorLight) => {
            const boxWidth = 60;
            const whiskerWidth = 30;

            // Calculate whisker bounds (1.5 * IQR or data bounds)
            const lowerWhisker = Math.max(stats.min, stats.q1 - 1.5 * stats.iqr);
            const upperWhisker = Math.min(stats.max, stats.q3 + 1.5 * stats.iqr);

            // Draw whiskers
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;

            // Lower whisker
            ctx.beginPath();
            ctx.moveTo(centerX, scaleY(stats.q1));
            ctx.lineTo(centerX, scaleY(lowerWhisker));
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(centerX - whiskerWidth / 2, scaleY(lowerWhisker));
            ctx.lineTo(centerX + whiskerWidth / 2, scaleY(lowerWhisker));
            ctx.stroke();

            // Upper whisker
            ctx.beginPath();
            ctx.moveTo(centerX, scaleY(stats.q3));
            ctx.lineTo(centerX, scaleY(upperWhisker));
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(centerX - whiskerWidth / 2, scaleY(upperWhisker));
            ctx.lineTo(centerX + whiskerWidth / 2, scaleY(upperWhisker));
            ctx.stroke();

            // Draw box
            const boxTop = scaleY(stats.q3);
            const boxBottom = scaleY(stats.q1);
            const boxHeight = boxBottom - boxTop;

            ctx.fillStyle = colorLight;
            ctx.fillRect(centerX - boxWidth / 2, boxTop, boxWidth, boxHeight);
            ctx.strokeRect(centerX - boxWidth / 2, boxTop, boxWidth, boxHeight);

            // Draw median line
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(centerX - boxWidth / 2, scaleY(stats.median));
            ctx.lineTo(centerX + boxWidth / 2, scaleY(stats.median));
            ctx.stroke();

            // Draw mean as a diamond
            ctx.lineWidth = 2;
            const meanY = scaleY(stats.mean);
            ctx.beginPath();
            ctx.moveTo(centerX, meanY - 5);
            ctx.lineTo(centerX + 5, meanY);
            ctx.lineTo(centerX, meanY + 5);
            ctx.lineTo(centerX - 5, meanY);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();

            // Draw outliers
            data.forEach(val => {
                if (val < lowerWhisker || val > upperWhisker) {
                    ctx.beginPath();
                    ctx.arc(centerX, scaleY(val), 4, 0, Math.PI * 2);
                    ctx.fillStyle = colorLight;
                    ctx.fill();
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            });
        };

        // Draw boxes
        const boxSpacing = chartWidth / 3;
        drawBox(beforeStats, beforeData, padding.left + boxSpacing, this.colors.before, this.colors.beforeLight);
        drawBox(afterStats, afterData, padding.left + 2 * boxSpacing, this.colors.after, this.colors.afterLight);

        // Draw labels
        ctx.fillStyle = this.colors.textDark;
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Before', padding.left + boxSpacing, height - padding.bottom + 10);
        ctx.fillText('After', padding.left + 2 * boxSpacing, height - padding.bottom + 10);

        // Draw axes
        ctx.strokeStyle = this.colors.textDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();
    },

    /**
     * Draw scatter plot with data points
     */
    drawScatter: function(canvasId, beforeData, afterData) {
        const { ctx, width, height } = this.prepareCanvas(canvasId);
        const padding = { top: 30, right: 30, bottom: 40, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Find overall range
        const allData = [...beforeData, ...afterData];
        const minVal = Math.min(...allData);
        const maxVal = Math.max(...allData);
        const range = maxVal - minVal || 1;
        const buffer = range * 0.1;
        const displayMin = minVal - buffer;
        const displayMax = maxVal + buffer;
        const displayRange = displayMax - displayMin;

        const scaleY = (val) => padding.top + chartHeight - ((val - displayMin) / displayRange) * chartHeight;

        // Draw grid
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        // Y-axis labels
        ctx.fillStyle = this.colors.text;
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) {
            const value = displayMax - (displayRange / 5) * i;
            const y = padding.top + (chartHeight / 5) * i;
            ctx.fillText(value.toFixed(1), padding.left - 8, y);
        }

        // Calculate x positions
        const beforeSection = chartWidth * 0.4;
        const afterSection = chartWidth * 0.4;
        const gapStart = padding.left + beforeSection;
        const afterStart = gapStart + chartWidth * 0.2;

        // Draw section labels
        ctx.fillStyle = this.colors.textDark;
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Before', padding.left + beforeSection / 2, height - padding.bottom + 10);
        ctx.fillText('After', afterStart + afterSection / 2, height - padding.bottom + 10);

        // Draw mean lines
        const beforeMean = Stats.mean(beforeData);
        const afterMean = Stats.mean(afterData);

        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;

        // Before mean
        ctx.strokeStyle = this.colors.before;
        ctx.beginPath();
        ctx.moveTo(padding.left, scaleY(beforeMean));
        ctx.lineTo(gapStart, scaleY(beforeMean));
        ctx.stroke();

        // After mean
        ctx.strokeStyle = this.colors.after;
        ctx.beginPath();
        ctx.moveTo(afterStart, scaleY(afterMean));
        ctx.lineTo(width - padding.right, scaleY(afterMean));
        ctx.stroke();

        ctx.setLineDash([]);

        // Draw connecting line between means
        ctx.strokeStyle = this.colors.text;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(gapStart, scaleY(beforeMean));
        ctx.lineTo(afterStart, scaleY(afterMean));
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw data points with jitter
        const drawPoints = (data, startX, sectionWidth, color, colorLight) => {
            data.forEach((val, i) => {
                // Add jitter to x position
                const jitter = (Math.random() - 0.5) * sectionWidth * 0.7;
                const x = startX + sectionWidth / 2 + jitter;
                const y = scaleY(val);

                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fillStyle = colorLight;
                ctx.fill();
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            });
        };

        drawPoints(beforeData, padding.left, beforeSection, this.colors.before, this.colors.beforeLight);
        drawPoints(afterData, afterStart, afterSection, this.colors.after, this.colors.afterLight);

        // Draw axes
        ctx.strokeStyle = this.colors.textDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();

        // Draw legend
        this.drawLegend(ctx, width, padding.top);
    },

    /**
     * Draw legend
     */
    drawLegend: function(ctx, width, top) {
        const legendX = width - 150;
        const legendY = top;

        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Before legend
        ctx.fillStyle = this.colors.before;
        ctx.fillRect(legendX, legendY, 14, 14);
        ctx.fillStyle = this.colors.text;
        ctx.fillText('Before', legendX + 20, legendY + 7);

        // After legend
        ctx.fillStyle = this.colors.after;
        ctx.fillRect(legendX + 70, legendY, 14, 14);
        ctx.fillStyle = this.colors.text;
        ctx.fillText('After', legendX + 90, legendY + 7);
    },

    /**
     * Render all before/after charts
     */
    renderAll: function(beforeData, afterData, beforeStats, afterStats) {
        this.drawHistogram('ba-histogram-chart', beforeData, afterData);
        this.drawBoxPlot('ba-boxplot-chart', beforeData, afterData, beforeStats, afterStats);
        this.drawScatter('ba-scatter-chart', beforeData, afterData);
    },

    // ==========================================
    // Multi-Variate Charts
    // ==========================================

    /**
     * Color palette for multiple groups/treatments
     */
    palette: [
        { main: '#6366f1', light: 'rgba(99, 102, 241, 0.3)' },
        { main: '#10b981', light: 'rgba(16, 185, 129, 0.3)' },
        { main: '#f59e0b', light: 'rgba(245, 158, 11, 0.3)' },
        { main: '#ef4444', light: 'rgba(239, 68, 68, 0.3)' },
        { main: '#8b5cf6', light: 'rgba(139, 92, 246, 0.3)' },
        { main: '#ec4899', light: 'rgba(236, 72, 153, 0.3)' },
        { main: '#14b8a6', light: 'rgba(20, 184, 166, 0.3)' },
        { main: '#f97316', light: 'rgba(249, 115, 22, 0.3)' }
    ],

    /**
     * Draw treatment effects bar chart
     */
    drawTreatmentEffects: function(canvasId, treatments) {
        const { ctx, width, height } = this.prepareCanvas(canvasId);
        const padding = { top: 30, right: 30, bottom: 60, left: 70 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Filter out insufficient data
        const validTreatments = treatments.filter(t => !t.insufficient);
        if (validTreatments.length === 0) {
            ctx.fillStyle = this.colors.text;
            ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Insufficient data for treatment effects', width / 2, height / 2);
            return;
        }

        // Find range
        const effects = validTreatments.map(t => t.percentEffect);
        const maxEffect = Math.max(...effects.map(Math.abs), 10);
        const displayRange = maxEffect * 1.2;

        const scaleY = (val) => padding.top + chartHeight / 2 - (val / displayRange) * (chartHeight / 2);

        // Draw grid
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        for (let i = -4; i <= 4; i++) {
            const y = scaleY((i / 4) * displayRange);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        // Draw zero line
        ctx.strokeStyle = this.colors.textDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding.left, scaleY(0));
        ctx.lineTo(width - padding.right, scaleY(0));
        ctx.stroke();

        // Draw bars
        const barWidth = Math.min(60, chartWidth / validTreatments.length * 0.6);
        const spacing = chartWidth / validTreatments.length;

        validTreatments.forEach((treatment, i) => {
            const x = padding.left + spacing * i + spacing / 2 - barWidth / 2;
            const effectY = scaleY(treatment.percentEffect);
            const zeroY = scaleY(0);
            const barHeight = Math.abs(effectY - zeroY);
            const barTop = treatment.percentEffect >= 0 ? effectY : zeroY;

            const color = this.palette[i % this.palette.length];
            ctx.fillStyle = color.light;
            ctx.strokeStyle = color.main;
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.rect(x, barTop, barWidth, barHeight);
            ctx.fill();
            ctx.stroke();

            // Label
            ctx.fillStyle = this.colors.textDark;
            ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.save();
            ctx.translate(x + barWidth / 2, height - padding.bottom + 10);
            ctx.rotate(-Math.PI / 6);
            ctx.fillText(treatment.name, 0, 0);
            ctx.restore();

            // Value label
            const valueY = treatment.percentEffect >= 0 ? effectY - 8 : effectY + barHeight + 14;
            ctx.fillStyle = treatment.percentEffect < 0 ? '#10b981' : '#ef4444';
            ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText((treatment.percentEffect > 0 ? '+' : '') + treatment.percentEffect.toFixed(1) + '%', x + barWidth / 2, valueY);
        });

        // Y-axis labels
        ctx.fillStyle = this.colors.text;
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = -4; i <= 4; i += 2) {
            const value = (i / 4) * displayRange;
            ctx.fillText((value > 0 ? '+' : '') + value.toFixed(0) + '%', padding.left - 8, scaleY(value));
        }

        // Draw axes
        ctx.strokeStyle = this.colors.textDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.stroke();
    },

    /**
     * Draw group comparison bar chart
     */
    drawGroupComparison: function(canvasId, groups) {
        const { ctx, width, height } = this.prepareCanvas(canvasId);
        const padding = { top: 30, right: 30, bottom: 60, left: 70 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        if (groups.length === 0) return;

        // Find range
        const maxMean = Math.max(...groups.map(g => g.stats.mean + g.stats.stdDev));
        const displayMax = maxMean * 1.1;

        const scaleY = (val) => padding.top + chartHeight - (val / displayMax) * chartHeight;

        // Draw grid
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        // Draw bars
        const barWidth = Math.min(60, chartWidth / groups.length * 0.6);
        const spacing = chartWidth / groups.length;

        groups.forEach((group, i) => {
            const x = padding.left + spacing * i + spacing / 2 - barWidth / 2;
            const meanY = scaleY(group.stats.mean);
            const barHeight = chartHeight - (meanY - padding.top);

            const color = this.palette[i % this.palette.length];

            // Draw bar
            ctx.fillStyle = color.light;
            ctx.strokeStyle = color.main;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.rect(x, meanY, barWidth, barHeight);
            ctx.fill();
            ctx.stroke();

            // Draw error bar (std dev)
            const errorTop = scaleY(group.stats.mean + group.stats.stdDev);
            const errorBottom = scaleY(Math.max(0, group.stats.mean - group.stats.stdDev));
            ctx.strokeStyle = color.main;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + barWidth / 2, errorTop);
            ctx.lineTo(x + barWidth / 2, errorBottom);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + barWidth / 2 - 8, errorTop);
            ctx.lineTo(x + barWidth / 2 + 8, errorTop);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + barWidth / 2 - 8, errorBottom);
            ctx.lineTo(x + barWidth / 2 + 8, errorBottom);
            ctx.stroke();

            // Label
            ctx.fillStyle = this.colors.textDark;
            ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.save();
            ctx.translate(x + barWidth / 2, height - padding.bottom + 10);
            ctx.rotate(-Math.PI / 6);
            ctx.fillText(group.name, 0, 0);
            ctx.restore();

            // Value label
            ctx.fillStyle = this.colors.textDark;
            ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText(group.stats.mean.toFixed(1), x + barWidth / 2, meanY - 8);
        });

        // Y-axis labels
        ctx.fillStyle = this.colors.text;
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) {
            const value = displayMax * (1 - i / 5);
            ctx.fillText(value.toFixed(0), padding.left - 8, padding.top + (chartHeight / 5) * i);
        }

        // Draw axes
        ctx.strokeStyle = this.colors.textDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();
    },

    // ==========================================
    // Time Complexity Charts
    // ==========================================

    /**
     * Draw complexity fit chart
     */
    drawComplexityFit: function(canvasId, data, bestFit, predictions) {
        const { ctx, width, height } = this.prepareCanvas(canvasId);
        const padding = { top: 30, right: 30, bottom: 50, left: 70 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        if (data.length === 0) return;

        // Find ranges
        const nValues = data.map(d => d.n);
        const times = data.map(d => d.time);
        const allTimes = [...times, ...predictions];

        const minN = Math.min(...nValues);
        const maxN = Math.max(...nValues);
        const nRange = maxN - minN || 1;

        const minTime = 0;
        const maxTime = Math.max(...allTimes) * 1.1;
        const timeRange = maxTime - minTime || 1;

        const scaleX = (n) => padding.left + ((n - minN) / nRange) * chartWidth;
        const scaleY = (t) => padding.top + chartHeight - ((t - minTime) / timeRange) * chartHeight;

        // Draw grid
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        // Draw fitted line
        if (bestFit && predictions.length > 0) {
            ctx.strokeStyle = bestFit.color;
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
            ctx.beginPath();

            // Generate smooth curve
            const smoothN = [];
            for (let i = 0; i <= 100; i++) {
                smoothN.push(minN + (nRange * i) / 100);
            }
            const smoothPredictions = Stats.generatePredictions(bestFit, smoothN);

            smoothN.forEach((n, i) => {
                const x = scaleX(n);
                const y = scaleY(smoothPredictions[i]);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Legend for fit line
            ctx.fillStyle = bestFit.color;
            ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(bestFit.name + ' fit', padding.left + 10, padding.top + 20);
        }

        // Draw data points
        ctx.fillStyle = 'rgba(99, 102, 241, 0.6)';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        data.forEach(d => {
            ctx.beginPath();
            ctx.arc(scaleX(d.n), scaleY(d.time), 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        // Y-axis labels
        ctx.fillStyle = this.colors.text;
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) {
            const value = maxTime * (1 - i / 5);
            ctx.fillText(value.toFixed(1), padding.left - 8, padding.top + (chartHeight / 5) * i);
        }

        // X-axis labels
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let i = 0; i <= 5; i++) {
            const value = minN + (nRange * i) / 5;
            ctx.fillText(value.toFixed(0), padding.left + (chartWidth * i) / 5, height - padding.bottom + 8);
        }

        // Axis labels
        ctx.fillStyle = this.colors.textDark;
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Input Size (n)', width / 2, height - 10);

        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Time', 0, 0);
        ctx.restore();

        // Draw axes
        ctx.strokeStyle = this.colors.textDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();
    },

    /**
     * Draw complexity class comparison chart
     */
    drawComplexityComparison: function(canvasId, data, fits) {
        const { ctx, width, height } = this.prepareCanvas(canvasId);
        const padding = { top: 30, right: 120, bottom: 50, left: 70 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        if (data.length === 0 || fits.length === 0) return;

        // Find ranges
        const nValues = data.map(d => d.n);
        const minN = Math.min(...nValues);
        const maxN = Math.max(...nValues);
        const nRange = maxN - minN || 1;

        // Calculate all predictions for scaling
        let maxTime = Math.max(...data.map(d => d.time));
        const topFits = fits.slice(0, 4); // Show top 4 fits

        topFits.forEach(fit => {
            const preds = Stats.generatePredictions(fit, nValues);
            maxTime = Math.max(maxTime, ...preds);
        });
        maxTime *= 1.1;

        const scaleX = (n) => padding.left + ((n - minN) / nRange) * chartWidth;
        const scaleY = (t) => padding.top + chartHeight - (t / maxTime) * chartHeight;

        // Draw grid
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        // Draw fitted curves
        topFits.forEach((fit, idx) => {
            ctx.strokeStyle = fit.color;
            ctx.lineWidth = fit.isBestFit ? 3 : 2;
            ctx.setLineDash(fit.isBestFit ? [] : [5, 5]);
            ctx.globalAlpha = fit.isBestFit ? 1 : 0.6;

            const smoothN = [];
            for (let i = 0; i <= 100; i++) {
                smoothN.push(minN + (nRange * i) / 100);
            }
            const preds = Stats.generatePredictions(fit, smoothN);

            ctx.beginPath();
            smoothN.forEach((n, i) => {
                const x = scaleX(n);
                const y = Math.max(padding.top, Math.min(height - padding.bottom, scaleY(preds[i])));
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
            ctx.globalAlpha = 1;
        });

        ctx.setLineDash([]);

        // Draw data points
        ctx.fillStyle = 'rgba(31, 41, 55, 0.8)';
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        data.forEach(d => {
            ctx.beginPath();
            ctx.arc(scaleX(d.n), scaleY(d.time), 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        // Draw legend
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'left';
        topFits.forEach((fit, i) => {
            const y = padding.top + 20 + i * 22;
            ctx.fillStyle = fit.color;
            ctx.fillRect(width - padding.right + 10, y - 6, 20, 12);
            ctx.fillStyle = this.colors.textDark;
            ctx.fillText(`${fit.name} (R²=${fit.rSquared.toFixed(3)})`, width - padding.right + 35, y + 2);
        });

        // Y-axis labels
        ctx.fillStyle = this.colors.text;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) {
            const value = maxTime * (1 - i / 5);
            ctx.fillText(value.toFixed(1), padding.left - 8, padding.top + (chartHeight / 5) * i);
        }

        // X-axis labels
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let i = 0; i <= 5; i++) {
            const value = minN + (nRange * i) / 5;
            ctx.fillText(value.toFixed(0), padding.left + (chartWidth * i) / 5, height - padding.bottom + 8);
        }

        // Axis labels
        ctx.fillStyle = this.colors.textDark;
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Input Size (n)', padding.left + chartWidth / 2, height - 10);

        // Draw axes
        ctx.strokeStyle = this.colors.textDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Charts;
}
