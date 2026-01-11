# Performance Analysis Tool

A static website providing statistical analysis tools for performance testing. Compare before/after data, analyze multi-variate experiments, and determine algorithm time complexity - all in the browser with no server required.

## Tools

### 1. Before/After Analysis
Compare two groups of timing data to determine if there's a statistically significant difference.

**Features:**
- Welch's t-test for comparing means with unequal variances
- Cohen's d effect size calculation
- Descriptive statistics (mean, median, std dev, quartiles)
- Interactive visualizations (histogram, box plot, scatter plot)
- Clear confidence level interpretation

### 2. Multi-Variate Analysis
Analyze the impact of multiple treatments/variables on performance.

**Features:**
- Define multiple treatments (e.g., "Caching", "CDN", "Compression")
- Create groups with different treatment combinations
- Estimate individual treatment effects using statistical comparison
- Visualize treatment impacts and group comparisons
- Identify which treatments significantly improve or worsen performance

### 3. Time Complexity Fitter
Determine the likely time complexity class of an algorithm from empirical data.

**Features:**
- Fits data to common complexity classes: O(1), O(log n), O(n), O(n log n), O(n²), O(n³), O(2ⁿ)
- R² goodness-of-fit scores for each class
- Visual comparison of actual data vs. fitted curves
- Practical interpretation of results

## Usage

1. Open `index.html` in a web browser
2. Select a tool using the tab navigation
3. Enter your data or click "Load Sample Data" to see an example
4. Click the analyze button to see results

### Input Formats

**Before/After & Multi-Variate:**
- Comma-separated: `120, 135, 128, 142`
- One per line
- Space or tab separated

**Time Complexity:**
- One pair per line: `n, time`
- Example:
  ```
  100, 5
  200, 12
  400, 45
  ```

## Hosting on GitHub Pages

1. Push this repository to GitHub
2. Go to repository Settings → Pages
3. Select "Deploy from a branch" and choose your branch
4. The site will be available at `https://<username>.github.io/<repo-name>/`

## Statistical Methods

### Welch's t-test
Used instead of Student's t-test because it doesn't assume equal variances between groups, making it more robust for real-world performance data.

### Cohen's d Effect Size
- **Negligible**: |d| < 0.2
- **Small**: 0.2 ≤ |d| < 0.5
- **Medium**: 0.5 ≤ |d| < 0.8
- **Large**: |d| ≥ 0.8

### R² (Coefficient of Determination)
For time complexity fitting, R² indicates how well the complexity model fits the data:
- **> 0.95**: Excellent fit
- **0.85 - 0.95**: Good fit
- **< 0.85**: Moderate fit, consider more data points

## Files

- `index.html` - Main HTML structure with tabbed interface
- `style.css` - Styling and responsive layout
- `stats.js` - Statistical analysis functions
- `charts.js` - Canvas-based chart rendering
- `app.js` - Main application logic for all tools

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). No build step or dependencies required.

## License

MIT
