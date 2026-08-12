import warnings

import life_simulation.content_safety_eval as safety_eval_module
from life_simulation.content_safety_eval import ContentSafetyEvaluator


def test_content_safety_corpus_is_a_passing_regression_gate():
    result = ContentSafetyEvaluator().evaluate()

    assert result["corpus_version"] == "content-safety-corpus-v1"
    assert result["case_count"] == 10
    assert result["gate_passed"] is True
    assert result["metrics"] == {
        "accuracy": 1.0,
        "unsafe_recall": 1.0,
        "safe_pass_rate": 1.0,
        "false_negative_count": 0,
        "false_positive_count": 0,
        "expected_code_miss_count": 0,
    }
    assert all("text" not in case for case in result["cases"])


def test_cleanup_lock_does_not_hide_a_completed_safety_result(monkeypatch):
    real_rmtree = safety_eval_module.shutil.rmtree
    attempts = 0

    def locked_once(path):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise PermissionError(32, "file is temporarily in use", path)
        return real_rmtree(path)

    monkeypatch.setattr(safety_eval_module.shutil, "rmtree", locked_once)

    result = ContentSafetyEvaluator().evaluate()

    assert result["gate_passed"] is True
    assert attempts == 2


def test_persistent_cleanup_lock_only_emits_a_warning(monkeypatch):
    real_mkdtemp = safety_eval_module.tempfile.mkdtemp
    real_rmtree = safety_eval_module.shutil.rmtree
    created = []

    def tracked_mkdtemp(*args, **kwargs):
        path = real_mkdtemp(*args, **kwargs)
        created.append(path)
        return path

    def always_locked(path):
        raise PermissionError(32, "file is temporarily in use", path)

    monkeypatch.setattr(safety_eval_module.tempfile, "mkdtemp", tracked_mkdtemp)
    monkeypatch.setattr(safety_eval_module.shutil, "rmtree", always_locked)

    try:
        with warnings.catch_warnings(record=True) as captured:
            warnings.simplefilter("always")
            result = ContentSafetyEvaluator().evaluate()
    finally:
        for path in created:
            real_rmtree(path, ignore_errors=True)

    assert result["gate_passed"] is True
    assert any("Could not remove isolated safety evaluation directory" in str(item.message) for item in captured)
