// In-browser Machine Learning Models: Logistic Regression (L2), Random Forest, Gradient Boosting, Baseline

export interface DatasetMatrix {
  X: number[][];
  y: number[];
  featureNames: string[];
}

export interface ScalerParams {
  means: number[];
  stds: number[];
}

export function fitStandardScaler(X: number[][]): ScalerParams {
  const numFeatures = X[0]?.length || 0;
  const n = X.length;
  const means: number[] = new Array(numFeatures).fill(0);
  const stds: number[] = new Array(numFeatures).fill(1);

  if (n === 0) return { means, stds };

  for (let j = 0; j < numFeatures; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += X[i][j];
    }
    means[j] = sum / n;

    let varSum = 0;
    for (let i = 0; i < n; i++) {
      const diff = X[i][j] - means[j];
      varSum += diff * diff;
    }
    const std = Math.sqrt(varSum / Math.max(1, n - 1));
    stds[j] = std > 1e-7 ? std : 1;
  }

  return { means, stds };
}

export function transformStandardScaler(X: number[][], scaler: ScalerParams): number[][] {
  return X.map((row) =>
    row.map((val, j) => (val - scaler.means[j]) / scaler.stds[j])
  );
}

// 1. Logistic Regression with L2 Regularization
export class LogisticRegressionL2 {
  weights: number[] = [];
  bias = 0;
  scaler?: ScalerParams;

  fit(X: number[][], y: number[], options = { lr: 0.08, epochs: 120, l2: 0.01, classWeight: 1.0 }) {
    this.scaler = fitStandardScaler(X);
    const scaledX = transformStandardScaler(X, this.scaler);
    const n = scaledX.length;
    const p = scaledX[0].length;

    this.weights = new Array(p).fill(0);
    this.bias = 0;

    // Gradient descent
    for (let epoch = 0; epoch < options.epochs; epoch++) {
      const gradW = new Array(p).fill(0);
      let gradB = 0;

      for (let i = 0; i < n; i++) {
        const xi = scaledX[i];
        const yi = y[i];

        // Sigmoid z
        let z = this.bias;
        for (let j = 0; j < p; j++) {
          z += this.weights[j] * xi[j];
        }
        const pred = 1 / (1 + Math.exp(-Math.max(-15, Math.min(15, z))));
        
        // Error with class weight on minority class
        const weight = yi === 1 ? options.classWeight : 1.0;
        const err = (pred - yi) * weight;

        for (let j = 0; j < p; j++) {
          gradW[j] += err * xi[j];
        }
        gradB += err;
      }

      // Update with L2 regularization
      for (let j = 0; j < p; j++) {
        const l2Term = options.l2 * this.weights[j];
        this.weights[j] -= (options.lr / n) * gradW[j] + options.lr * l2Term;
      }
      this.bias -= (options.lr / n) * gradB;
    }
  }

  predictProba(X: number[][]): number[] {
    if (!this.scaler) return new Array(X.length).fill(0.5);
    const scaledX = transformStandardScaler(X, this.scaler);
    const p = this.weights.length;

    return scaledX.map((xi) => {
      let z = this.bias;
      for (let j = 0; j < p; j++) {
        z += this.weights[j] * xi[j];
      }
      return 1 / (1 + Math.exp(-Math.max(-15, Math.min(15, z))));
    });
  }
}

// 2. Decision Tree Node for Random Forest and Gradient Boosting
interface TreeNode {
  isLeaf: boolean;
  prediction?: number;
  featureIndex?: number;
  splitValue?: number;
  left?: TreeNode;
  right?: TreeNode;
  gain?: number;
}

class DecisionTree {
  root?: TreeNode;
  maxDepth: number;
  minSamplesSplit: number;

  constructor(maxDepth = 5, minSamplesSplit = 6) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  fit(X: number[][], y: number[], featureSubsample = 1.0) {
    this.root = this.buildNode(X, y, 0, featureSubsample);
  }

  private buildNode(X: number[][], y: number[], depth: number, featureSubsample: number): TreeNode {
    const n = X.length;
    if (n === 0) return { isLeaf: true, prediction: 0 };

    const sumY = y.reduce((a, b) => a + b, 0);
    const meanY = sumY / n;

    // Stopping conditions
    if (depth >= this.maxDepth || n < this.minSamplesSplit || meanY === 0 || meanY === 1) {
      return { isLeaf: true, prediction: meanY };
    }

    const numFeatures = X[0].length;
    const featuresToTry: number[] = [];
    const numSubsample = Math.max(1, Math.round(numFeatures * featureSubsample));
    
    // Feature subsampling
    const allIndices = Array.from({ length: numFeatures }, (_, i) => i);
    for (let i = 0; i < numSubsample; i++) {
      const randIdx = Math.floor(Math.random() * allIndices.length);
      featuresToTry.push(allIndices[randIdx]);
      allIndices.splice(randIdx, 1);
    }

    let bestGain = -1;
    let bestFeature = -1;
    let bestSplit = 0;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    const parentGini = 1 - (meanY * meanY + (1 - meanY) * (1 - meanY));

    for (const fIdx of featuresToTry) {
      // Sample unique potential split values
      const vals = X.map((row) => row[fIdx]);
      const sampleSplits = Array.from(new Set(vals)).slice(0, 15);

      for (const splitVal of sampleSplits) {
        const leftIdx: number[] = [];
        const rightIdx: number[] = [];

        for (let i = 0; i < n; i++) {
          if (X[i][fIdx] <= splitVal) leftIdx.push(i);
          else rightIdx.push(i);
        }

        if (leftIdx.length < 2 || rightIdx.length < 2) continue;

        const leftMean = leftIdx.reduce((acc, idx) => acc + y[idx], 0) / leftIdx.length;
        const rightMean = rightIdx.reduce((acc, idx) => acc + y[idx], 0) / rightIdx.length;

        const leftGini = 1 - (leftMean * leftMean + (1 - leftMean) * (1 - leftMean));
        const rightGini = 1 - (rightMean * rightMean + (1 - rightMean) * (1 - rightMean));

        const weightedGini = (leftIdx.length / n) * leftGini + (rightIdx.length / n) * rightGini;
        const gain = parentGini - weightedGini;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = fIdx;
          bestSplit = splitVal;
          bestLeftIndices = leftIdx;
          bestRightIndices = rightIdx;
        }
      }
    }

    if (bestGain <= 0.0001 || bestLeftIndices.length === 0 || bestRightIndices.length === 0) {
      return { isLeaf: true, prediction: meanY };
    }

    const leftX = bestLeftIndices.map((i) => X[i]);
    const leftY = bestLeftIndices.map((i) => y[i]);
    const rightX = bestRightIndices.map((i) => X[i]);
    const rightY = bestRightIndices.map((i) => y[i]);

    return {
      isLeaf: false,
      featureIndex: bestFeature,
      splitValue: bestSplit,
      gain: bestGain,
      left: this.buildNode(leftX, leftY, depth + 1, featureSubsample),
      right: this.buildNode(rightX, rightY, depth + 1, featureSubsample),
    };
  }

  predictRow(row: number[]): number {
    let curr = this.root;
    while (curr && !curr.isLeaf) {
      if (curr.featureIndex !== undefined && curr.splitValue !== undefined) {
        curr = row[curr.featureIndex] <= curr.splitValue ? curr.left : curr.right;
      } else {
        break;
      }
    }
    return curr?.prediction ?? 0.5;
  }
}

// 2. Random Forest Classifier
export class RandomForestModel {
  trees: DecisionTree[] = [];
  numTrees: number;
  featureImportanceMap: Record<number, number> = {};

  constructor(numTrees = 28) {
    this.numTrees = numTrees;
  }

  fit(X: number[][], y: number[]) {
    this.trees = [];
    this.featureImportanceMap = {};
    const n = X.length;
    const numFeatures = X[0]?.length || 0;
    const featureSubsample = Math.min(1.0, Math.sqrt(numFeatures) / numFeatures + 0.15);

    for (let t = 0; t < this.numTrees; t++) {
      // Bootstrap sampling
      const bootX: number[][] = [];
      const bootY: number[] = [];
      for (let i = 0; i < n; i++) {
        const randIdx = Math.floor(Math.random() * n);
        bootX.push(X[randIdx]);
        bootY.push(y[randIdx]);
      }

      const tree = new DecisionTree(5, 5);
      tree.fit(bootX, bootY, featureSubsample);
      this.trees.push(tree);

      // Accumulate feature importance from tree splits
      this.collectGains(tree.root);
    }
  }

  private collectGains(node?: TreeNode) {
    if (!node || node.isLeaf) return;
    if (node.featureIndex !== undefined && node.gain) {
      this.featureImportanceMap[node.featureIndex] = (this.featureImportanceMap[node.featureIndex] || 0) + node.gain;
    }
    this.collectGains(node.left);
    this.collectGains(node.right);
  }

  predictProba(X: number[][]): number[] {
    return X.map((row) => {
      let sum = 0;
      for (const tree of this.trees) {
        sum += tree.predictRow(row);
      }
      return sum / this.trees.length;
    });
  }
}

// 3. Gradient Boosted Decision Trees
export class GradientBoostingModel {
  trees: DecisionTree[] = [];
  learningRate: number;
  numIterations: number;
  initialLogOdds = 0;

  constructor(numIterations = 24, learningRate = 0.12) {
    this.numIterations = numIterations;
    this.learningRate = learningRate;
  }

  fit(X: number[][], y: number[]) {
    this.trees = [];
    const n = X.length;
    const posCount = y.reduce((a, b) => a + b, 0);
    const p0 = Math.max(0.01, Math.min(0.99, posCount / n));
    this.initialLogOdds = Math.log(p0 / (1 - p0));

    // Raw logits predictions
    const rawF = new Array(n).fill(this.initialLogOdds);

    for (let iter = 0; iter < this.numIterations; iter++) {
      // Compute pseudo-residuals r_i = y_i - p_i
      const residuals = new Array(n);
      for (let i = 0; i < n; i++) {
        const prob = 1 / (1 + Math.exp(-rawF[i]));
        residuals[i] = y[i] - prob;
      }

      // Train tree on residuals
      const tree = new DecisionTree(4, 8);
      tree.fit(X, residuals, 0.8);
      this.trees.push(tree);

      // Update predictions
      for (let i = 0; i < n; i++) {
        rawF[i] += this.learningRate * tree.predictRow(X[i]);
      }
    }
  }

  predictProba(X: number[][]): number[] {
    return X.map((row) => {
      let rawF = this.initialLogOdds;
      for (const tree of this.trees) {
        rawF += this.learningRate * tree.predictRow(row);
      }
      return 1 / (1 + Math.exp(-Math.max(-12, Math.min(12, rawF))));
    });
  }
}

// 4. Baseline Majority Class Model
export class BaselineModel {
  baseProb = 0.18;

  fit(_X: number[][], y: number[]) {
    const sum = y.reduce((a, b) => a + b, 0);
    this.baseProb = sum / Math.max(1, y.length);
  }

  predictProba(X: number[][]): number[] {
    return new Array(X.length).fill(this.baseProb);
  }
}
