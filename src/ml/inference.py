"""
AURA-BTC Anomaly Inference Engine
Loads a trained IsolationForest pipeline and scores wallets.
"""

import os

import joblib
import numpy as np
import pandas as pd

from src.ml.features import FEATURE_COLUMNS

# Default model path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_DEFAULT_MODEL_PATH = os.path.join(_PROJECT_ROOT, "models", "anomaly_detector.joblib")


def _sigmoid(x: np.ndarray) -> np.ndarray:
    """Numerically stable sigmoid function."""
    return 1.0 / (1.0 + np.exp(-x))


class AnomalyInferenceEngine:
    """
    Loads a trained anomaly detection pipeline and scores wallet feature vectors.

    The pipeline expects 20-feature input vectors and produces anomaly scores
    in the range [0.0, 1.0], where higher = more anomalous.
    """

    def __init__(self, model_path: str = _DEFAULT_MODEL_PATH):
        """
        Initialize the inference engine.

        Args:
            model_path: Path to the joblib-serialized pipeline.
                        Defaults to models/anomaly_detector.joblib
        """
        self.model_path = model_path
        self.pipeline = None
        self.load_model()

    def load_model(self) -> None:
        """
        Load the trained pipeline from disk.

        Raises:
            FileNotFoundError: If the model file doesn't exist
        """
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(
                f"Trained model not found at {self.model_path}. "
                "Run training first: POST /api/ml/train or ./scripts/train.sh"
            )
        self.pipeline = joblib.load(self.model_path)

    def score_wallets(self, features_df: pd.DataFrame) -> pd.DataFrame:
        """
        Score wallet feature vectors for anomalies.

        Uses the pipeline's decision_function() and applies a sigmoid
        transformation. Lower raw scores = higher anomaly scores.

        Args:
            features_df: DataFrame with wallet_address column and 20 feature columns

        Returns:
            Same DataFrame with an added 'anomaly_score' column [0.0, 1.0]
        """
        if self.pipeline is None:
            self.load_model()

        df = features_df.copy()

        if df.empty:
            df["anomaly_score"] = pd.Series(dtype=float)
            return df

        # Prepare feature matrix
        X = df[FEATURE_COLUMNS].values.astype(np.float64)
        X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

        # Get raw anomaly scores from IsolationForest
        # decision_function returns negative values for anomalies
        raw_scores = self.pipeline.decision_function(X)

        # Transform: negate (so anomalies are positive) → sigmoid → [0, 1]
        # More negative raw score = more anomalous = higher final score
        anomaly_scores = _sigmoid(-raw_scores * 5)  # Scale factor for spread

        # Clip to [0, 1]
        anomaly_scores = np.clip(anomaly_scores, 0.0, 1.0)

        df["anomaly_score"] = anomaly_scores

        return df
