# Performance Analysis Tool

A simple static website for performing statistical analysis on performance test data. Compare "before" and "after" timing measurements to determine if changes resulted in statistically significant improvements or regressions.

## Features

- **Statistical Analysis**: Uses Welch's t-test to compare two groups with unequal variances
- **Effect Size**: Calculates Cohen's d to measure practical significance
- **Descriptive Statistics**: Mean, median, standard deviation, quartiles, and more
- **Interactive Charts**: Histogram, box plot, and scatter plot visualizations
- **Confidence Levels**: Clear interpretation of statistical significance
- **No Dependencies**: Pure vanilla JavaScript - no build step required

## Usage

1. Open `index.html` in a web browser
2. Enter timing values for the "Before" (control) group
3. Enter timing values for the "After" (treatment) group
4. Click "Analyze Performance" to see results

### Input Format

Values can be entered:
- Comma-separated: `120, 135, 128, 142`
- One per line:
  ```
  120
  135
  128
  ```
- Space or tab separated

## Hosting on GitHub Pages

1. Push this repository to GitHub
2. Go to repository Settings → Pages
3. Select "Deploy from a branch" and choose `main` (or your branch)
4. The site will be available at `https://<username>.github.io/<repo-name>/`

## Statistical Methods

### Welch's t-test
Used instead of Student's t-test because it doesn't assume equal variances between groups, making it more robust for real-world performance data.

### Cohen's d Effect Size
- **Negligible**: |d| < 0.2
- **Small**: 0.2 ≤ |d| < 0.5
- **Medium**: 0.5 ≤ |d| < 0.8
- **Large**: |d| ≥ 0.8

### Confidence Levels
- **Very High (99.9%)**: p < 0.001
- **High (99%)**: p < 0.01
- **Moderate (95%)**: p < 0.05
- **Low (90%)**: p < 0.1
- **Insufficient**: p ≥ 0.1

## Files

- `index.html` - Main HTML structure
- `style.css` - Styling and layout
- `stats.js` - Statistical analysis functions
- `charts.js` - Canvas-based chart rendering
- `app.js` - Main application logic

## License

MIT
