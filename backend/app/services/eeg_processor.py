import mne
import pywt
import numpy as np
import pandas as pd
import scipy.stats
from scipy.signal import welch


# ============================================================
# SAFE STATISTICAL FUNCTIONS
# ============================================================

def safe_stat(value):
    value = float(value)

    if not np.isfinite(value):
        return 0.0

    return value


def calculate_entropy(coefficients):
    energy = np.square(coefficients)
    total_energy = np.sum(energy)

    if total_energy <= 0 or not np.isfinite(total_energy):
        return 0.0

    probability = energy / total_energy
    probability = probability[probability > 0]

    if len(probability) == 0:
        return 0.0

    return float(
        -np.sum(
            probability * np.log2(probability)
        )
    )


# ============================================================
# DWT FEATURES
# ============================================================

def extract_statistical_features(coefficients):

    return {
        "mean": safe_stat(
            np.mean(coefficients)
        ),

        "std": safe_stat(
            np.std(coefficients)
        ),

        "variance": safe_stat(
            np.var(coefficients)
        ),

        "entropy": safe_stat(
            calculate_entropy(coefficients)
        ),

        "skewness": safe_stat(
            scipy.stats.skew(coefficients)
        ),

        "kurtosis": safe_stat(
            scipy.stats.kurtosis(coefficients)
        )
    }


def extract_dwt_features(
    signal,
    wavelet="db4",
    level=5
):

    coefficients = pywt.wavedec(
        signal,
        wavelet,
        level=level
    )

    names = [
        "cA5",
        "cD5",
        "cD4",
        "cD3",
        "cD2",
        "cD1"
    ]

    features = {}

    for name, coeff in zip(
        names,
        coefficients
    ):

        stats = extract_statistical_features(
            coeff
        )

        for feature_name, value in stats.items():

            features[
                f"{name}_{feature_name}"
            ] = value

    return features


# ============================================================
# FREQUENCY FEATURES
# ============================================================

def calculate_band_powers(
    signal,
    sfreq
):

    frequencies, power = welch(
        signal,
        fs=sfreq,
        nperseg=min(
            1024,
            len(signal)
        )
    )

    bands = {
        "delta": (0.5, 4),
        "theta": (4, 8),
        "alpha": (8, 13),
        "beta": (13, 30),
        "gamma": (30, 45)
    }

    valid = (
        (frequencies >= 0.5) &
        (frequencies <= 45)
    )

    total_power = np.trapezoid(
        power[valid],
        frequencies[valid]
    )

    features = {}

    for band_name, (
        low,
        high
    ) in bands.items():

        mask = (
            (frequencies >= low) &
            (frequencies < high)
        )

        if np.any(mask):

            band_power = np.trapezoid(
                power[mask],
                frequencies[mask]
            )

        else:

            band_power = 0.0

        # Relative band power
        relative_power = (
            band_power / total_power
            if total_power > 0
            else 0.0
        )

        features[band_name] = safe_stat(
            relative_power
        )

    return features


# ============================================================
# CHANNEL FEATURES
# ============================================================

def extract_channel_features(
    signal,
    sfreq
):

    features = {}

    # DWT features
    features.update(
        extract_dwt_features(
            signal,
            "db4",
            5
        )
    )

    # Frequency features
    features.update(
        calculate_band_powers(
            signal,
            sfreq
        )
    )

    return features


# ============================================================
# EEG FEATURE EXTRACTION FOR PREDICTION
# ============================================================

def extract_features_for_prediction(
    edf_path
):

    print("=" * 60)
    print("Processing EDF for prediction")
    print("=" * 60)

    print("File:", edf_path)

    # --------------------------------------------------------
    # LOAD EDF
    # --------------------------------------------------------

    raw = mne.io.read_raw_edf(
        edf_path,
        preload=True,
        verbose=False
    )

    sfreq = float(
        raw.info["sfreq"]
    )

    print(
        "Sampling frequency:",
        sfreq
    )

    print(
        "Channels:",
        len(raw.ch_names)
    )

    print(
        "Duration:",
        raw.times[-1]
    )

    # --------------------------------------------------------
    # AVERAGE REFERENCE
    # Same as training
    # --------------------------------------------------------

    raw.set_eeg_reference(
        "average",
        projection=False,
        verbose=False
    )

    # --------------------------------------------------------
    # BAND-PASS FILTER
    # Same as training
    # --------------------------------------------------------

    raw.filter(
        l_freq=0.5,
        h_freq=45.0,
        verbose=False
    )

    data = raw.get_data()

    print(
        "Filtered EEG shape:",
        data.shape
    )

    # --------------------------------------------------------
    # 5-SECOND WINDOW
    # 50% OVERLAP
    # --------------------------------------------------------

    WINDOW_SECONDS = 5
    OVERLAP = 0.50

    window_samples = int(
        round(
            WINDOW_SECONDS * sfreq
        )
    )

    step_samples = int(
        round(
            window_samples *
            (1 - OVERLAP)
        )
    )

    n_samples = data.shape[1]

    if step_samples <= 0:
        raise ValueError(
            "Invalid overlap/window settings."
        )

    n_segments = (
        1 +
        (
            n_samples -
            window_samples
        ) // step_samples
        if n_samples >= window_samples
        else 0
    )

    print(
        "Window:",
        WINDOW_SECONDS,
        "seconds"
    )

    print(
        "Overlap:",
        OVERLAP * 100,
        "%"
    )

    print(
        "Samples/window:",
        window_samples
    )

    print(
        "Step samples:",
        step_samples
    )

    print(
        "Number of 5-second segments:",
        n_segments
    )

    # --------------------------------------------------------
    # EXTRACT FEATURES
    # --------------------------------------------------------

    rows = []

    for segment_index in range(
        n_segments
    ):

        start_sample = (
            segment_index *
            step_samples
        )

        end_sample = (
            start_sample +
            window_samples
        )

        row = {}

        for channel_index in range(
            data.shape[0]
        ):

            signal = data[
                channel_index,
                start_sample:end_sample
            ]

            channel_features = (
                extract_channel_features(
                    signal,
                    sfreq
                )
            )

            for (
                feature_name,
                value
            ) in channel_features.items():

                row[
                    f"ch{channel_index + 1}_{feature_name}"
                ] = value

        row["segment"] = segment_index

        row["start_time"] = (
            start_sample / sfreq
        )

        row["end_time"] = (
            end_sample / sfreq
        )

        rows.append(row)

        if (
            (segment_index + 1) % 100 == 0
            or
            segment_index == n_segments - 1
        ):

            print(
                f"Processed "
                f"{segment_index + 1}/"
                f"{n_segments} segments"
            )

    # --------------------------------------------------------
    # CREATE DATAFRAME
    # --------------------------------------------------------

    features = pd.DataFrame(
        rows
    )

    print(
        "\nFeature extraction completed."
    )

    print(
        "Extracted shape:",
        features.shape
    )

    return features