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
     * Render all charts
     */
    renderAll: function(beforeData, afterData, beforeStats, afterStats) {
        this.drawHistogram('histogram-chart', beforeData, afterData);
        this.drawBoxPlot('boxplot-chart', beforeData, afterData, beforeStats, afterStats);
        this.drawScatter('scatter-chart', beforeData, afterData);
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Charts;
}
