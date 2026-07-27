from live2d_motion import MotionDirectorV3, is_motion_v3_candidate, parse_motion_plan


def valid_motion(**changes):
    motion = {
        "duration_ms": 1800,
        "variation_seed": 7,
        "blend": {"in_ms": 100, "out_ms": 180},
        "tracks": [{
            "channel": "head_pitch",
            "mode": "override",
            "keyframes": [
                {"t": 0.0, "value": 0.0, "easing": "ease_in_out"},
                {"t": 0.5, "value": -0.6, "easing": "ease_in_out"},
                {"t": 1.0, "value": 0.0, "easing": "ease_in_out"},
            ],
        }],
    }
    motion.update(changes)
    return motion


def test_motion_v3_candidate_is_any_object_that_declares_tracks():
    assert is_motion_v3_candidate({"tracks": []}) is True
    assert is_motion_v3_candidate({"intent": "thinking"}) is False
    assert is_motion_v3_candidate([]) is False


def test_parse_motion_plan_keeps_only_safe_semantic_tracks():
    motion = valid_motion(tracks=[
        valid_motion()["tracks"][0],
        {
            "channel": "mouth_open",
            "mode": "override",
            "keyframes": [{"t": 0.0, "value": 0.0}, {"t": 1.0, "value": 1.0}],
        },
    ])

    parsed = parse_motion_plan(motion)

    assert [track["channel"] for track in parsed["tracks"]] == ["head_pitch"]


def test_parse_motion_plan_rejects_non_finite_and_out_of_order_frames():
    assert parse_motion_plan(valid_motion(tracks=[{
        "channel": "head_pitch",
        "mode": "override",
        "keyframes": [{"t": 0.8, "value": 0.0}, {"t": 0.2, "value": 0.4}],
    }])) is None
    assert parse_motion_plan(valid_motion(tracks=[{
        "channel": "head_pitch",
        "mode": "override",
        "keyframes": [{"t": 0.0, "value": float("nan")}, {"t": 1.0, "value": 0.0}],
    }])) is None


def test_director_overwrites_ai_authority_fields_and_rate_limits_per_user():
    now = [1785124800.0]
    director = MotionDirectorV3(
        clock=lambda: now[0],
        id_factory=lambda: "motion-1",
    )

    event = director.decide("u-1", {
        **valid_motion(),
        "type": "forged",
        "source": "user_command",
        "motion_id": "forged-id",
        "created_at_ms": 1,
    })

    assert event["type"] == "live2d_motion_v3"
    assert event["source"] == "ai_reply"
    assert event["motion_id"] == "motion-1"
    assert event["created_at_ms"] == 1785124800000
    assert event["expires_at_ms"] == 1785124810000
    assert director.decide("u-1", valid_motion()) is None
    assert director.decide("u-2", valid_motion()) is not None
